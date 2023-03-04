export default class Config
{
    static readonly DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
    static readonly AWS_REGION = process.env.AWS_REGION || 'us-east-1';
};