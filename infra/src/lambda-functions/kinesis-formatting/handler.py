import base64
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    logger.info('Loading JSONL Processing Function')

    output = []

    for record in event['records']:
        try:
            payload = base64.b64decode(record['data']).decode('utf-8')

            parsed_data = json.loads(payload)

            formatted_jsonl = json.dumps(parsed_data) + '\n'

            encoded_data = base64.b64encode(formatted_jsonl.encode('utf-8')).decode('utf-8')

            output.append({
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': encoded_data
            })
        except Exception as error:
            logger.error(f"Error processing record {record['recordId']}: {error}")

            output.append({
                'recordId': record['recordId'],
                'result': 'ProcessingFailed',
                'data': record['data']
            })

    successful_records = sum(1 for r in output if r['result'] == 'Ok')
    logger.info(f"Processing completed. Successful records: {successful_records}")

    return {'records': output}
