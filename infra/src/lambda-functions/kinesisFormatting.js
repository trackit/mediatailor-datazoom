console.log('Loading JSONL Processing Function');

export const handler = async (event) => {
    const output = event.records.map((record) => {
        try {
            const payload = Buffer.from(record.data, 'base64').toString('utf-8');

            const parsedData = JSON.parse(payload);

            const formattedJSONL = JSON.stringify(parsedData) + '\n';

            return {
                recordId: record.recordId,
                result: 'Ok',
                data: Buffer.from(formattedJSONL, 'utf-8').toString('base64'),
            };
        } catch (error) {
            console.error(`Error processing record ${record.recordId}:`, error);

            return {
                recordId: record.recordId,
                result: 'ProcessingFailed',
                data: record.data,
            };
        }
    });

    console.log(`Processing completed. Successful records: ${output.filter(r => r.result === 'Ok').length}`);
    return { records: output };
};
