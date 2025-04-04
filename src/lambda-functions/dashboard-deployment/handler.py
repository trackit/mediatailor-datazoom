import json
import os
import boto3
import cfnresponse
import urllib3


s3 = boto3.client("s3")
grafana = boto3.client("grafana")

http = urllib3.PoolManager()


def create_service_account_token(workspace_id):
    service_account_res = grafana.create_workspace_service_account(
        grafanaRole="ADMIN",
        name=f"{workspace_id}-service-account",
        workspaceId=workspace_id
    )

    if service_account_res["ResponseMetadata"]["HTTPStatusCode"] != 200:
        raise Exception("Failed to create service account")

    service_account_token_res = grafana.create_workspace_service_account_token(
        name=f"{workspace_id}-service-account-token",
        secondsToLive=300,
        serviceAccountId=service_account_res["id"],
        workspaceId=workspace_id
    )

    return {
        "token": service_account_token_res["serviceAccountToken"]["key"],
        "service_account_id": service_account_res["id"]
    }


def delete_service_account(workspace_id, service_account_id):
    response = grafana.delete_workspace_service_account(
        serviceAccountId=service_account_id,
        workspaceId=workspace_id
    )

    if response["ResponseMetadata"]["HTTPStatusCode"] != 200:
        raise Exception("Failed to delete service account")


def install_athena_data_source_plugin(grafana_endpoint, headers):
    http = urllib3.PoolManager()

    http.request(
        "POST",
        f"{grafana_endpoint}/api/plugins/grafana-athena-datasource/install",
        headers=headers,
        body=json.dumps({
            "version": "3.1.1"
        })
    )


def create_dashboard(grafana_endpoint, headers, body):
    response = http.request("POST", f'{grafana_endpoint}/api/dashboards/db', headers=headers, body=body)

    if response.status != 200:
        raise Exception(f"Failed to create dashboard: {response.data}")

    
def create_athena_data_source(grafana_endpoint, headers):
    payload = {
        "name": "Athena",
        "type": "grafana-athena-datasource",
        "access": "proxy",
        "jsonData": {
            "authType": "default",
            "defaultRegion": os.getenv("ATHENA_REGION", "us-west-2"),
            "catalog":  os.getenv("ATHENA_CATALOG", "AwsDataCatalog"),
            "database": os.getenv("GLUE_DATABASE_NAME"),
            "workgroup": os.getenv("ATHENA_WORKGROUP")
        }
    }

    response = http.request(
        "POST",
        f"{grafana_endpoint}/api/datasources",
        headers=headers,
        body=json.dumps(payload)
    )

    if response.status != 200:
        raise Exception(f"Failed to create Athena data source: {response.data}")
    
    response_data = json.loads(response.data.decode("utf-8"))
    datasource_id = response_data.get("datasource", {}).get("uid")

    if not datasource_id:
        raise Exception("Failed to retrieve one or both IDs from the response.")
    
    return datasource_id


def lambda_handler(event, context):
    try:
        if event["RequestType"] != "Create":
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            return

        with open(os.environ.get("TEMPLATE_PATH"), "r") as f:
            dashboard_definition = json.load(f)

        workspace_id = os.getenv("WORKSPACE_ID")
        grafana_endpoint = os.getenv("GRAFANA_ENDPOINT")

        token, service_account_id = create_service_account_token(workspace_id).values()

        glue_table = os.getenv("GLUE_TABLE_NAME")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }

        install_athena_data_source_plugin(grafana_endpoint, headers)
        data_source_id = create_athena_data_source(grafana_endpoint, headers)
        config_str = json.dumps(dashboard_definition).replace("$GLUE_TABLE", glue_table).replace("$DATASOURCE_UUID", data_source_id)
        create_dashboard(grafana_endpoint, headers, config_str)
        delete_service_account(workspace_id, service_account_id)

        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
    except Exception as e:
        print(e)
        cfnresponse.send(event, context, cfnresponse.FAILED, {})
