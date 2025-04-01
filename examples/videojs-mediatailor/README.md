# VideoJS / MediaTailor pipeline

This example demonstrates how to use VideoJS with MediaTailor to create a video player that can play content from AWS MediaTailor with ad insertion capabilities. The example includes a simple HTML page with a VideoJS player configured to send metrics using DataZoom.

### Prerequisites

- [SAM cli](https://aws.amazon.com/serverless/sam/)
- S3 Bucket containing two HLS playlists
- An ad decision server (ADS)

### Deploy

For simplicity, the MediaTailor playback configuration will be created manually in the AWS console, it was not possible to get the video content source url from the MediaTailor channel. The same applies to the channel programs. The rest of the pipeline will be created using the SAM template.

Execute the following command to deploy the pipeline:

```bash
cd infra
sam build
sam deploy --parameter-overrides \
  AssetsBucket=NAME_OF_THE_BUCKET \
  PrimaryVodSourcePath=PATH_OF_PRIMARY_VOD_SOURCE \
  SecondaryVodSourcePath=PATH_OF_SECONDARY_VOD_SOURCE
```

### MediaTailor configuration

1. In the AWS console, navigate to MediaTailor, and create a new playback configuration.

2. Fill in the following fields:
  - Name: Pick a name for the playback configuration
  - Content source: In the created MediaTailor channel, get the playback URL in the Outputs section
  - Ad decision server: `https://example.com/ads`

3. Create the playback configuration.

4. Take note of the session initialization prefix, ad the manifest name and extension at the end.
  - e.g. `https://8xkgu3wpm6y0zbg0ag6olwxn2ep08o5r.mediatailor.us-west-2.amazonaws.com/v1/session/pwehk0yyqloebsv6vxo643wenxp1ut1s876uyh14/mediatailor-datazoom/index.m3u8`


### Channel programs

Follow this [link](https://docs.aws.amazon.com/mediatailor/latest/ug/channel-assembly-adding-programs.html) to create the channel programs. The example uses two HLS playlists, one for the primary source and one for the secondary source. The primary source is the main content and the secondary source is the ad content.

### DataZoom configuration

1. Follow the steps in the main [README](../../README.md) to create the DataZoom resources.

2. In the [index.js](./player/index.js) file, set `mediatailorSessionURL` to the session initialization prefix from the MediaTailor playback configuration. This will be used to send metrics to DataZoom. Then set the `configuration_id` to the configuration ID from the DataZoom configuration.

___

Everything should be set up now. Open the `index.html` file in your browser and you should see a VideoJS player that can play content from MediaTailor with ad insertion capabilities. The player will also send metrics to DataZoom.
