import {IMock, Mock, It} from "typemoq";
import { assert as assert } from 'chai';
import { DynamoDbTransaction } from '../../src/managers/dynamodbTransaction';
import { TransactWriteItem, ConditionCheck } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

describe('DynamoDbTransaction', function () 
{
    let mockedClient:IMock<DynamoDBDocumentClient>;
    let called:boolean;
    let transactionOutput:any;
    let putParam:TransactWriteItem;
    let updateParam:TransactWriteItem;
    let deleteParam:TransactWriteItem;
    let conditionalCheck:ConditionCheck;

    function matches(val1?:any[], val2?: any[]): boolean {
        try {
            assert.deepEqual(val1, val2)
            return true;
        }
        catch(e){
            return false;
        }
    }

    beforeEach(() => 
    {
        called = false;
        mockedClient = Mock.ofType<DynamoDBDocumentClient>();
        transactionOutput = {on: ()=>{}, send: ()=>{}, promise: ()=>new Promise((resolve)=>resolve({Items:[true]}))}

        putParam = { Put: {TableName: 'table', Item: {}}};
        updateParam = { Update: {TableName: 'table', Key: {id: <any>'id'}, UpdateExpression: "Set something = 2"}};
        deleteParam = { Delete: {TableName: 'table', Key: {id: <any>'id'}}};
        conditionalCheck = { TableName: 'table', Key: {id: <any>'id'}, ConditionExpression: ""};
    });

    it('execute()', async () => 
    {
        mockedClient.setup(c => c.send(It.is((obj: TransactWriteCommand) => matches(obj.input.TransactItems, [putParam, updateParam, deleteParam]))))
                    .callback(()=>called=true).returns(()=>transactionOutput);
            
        let manager = await new DynamoDbTransaction(mockedClient.object)
        manager.add(putParam).add(updateParam).add(deleteParam).commit();

        assert.isTrue(called);
    });

    it('execute() - more than 10 operations', async () => 
    {
        let firstBatchCalled = false;
        let secondBatchCalled = false;
        let otherBatchCalled = false;

        let createOperation = (item:any) => ({ Put: {TableName: 'table', Item: item}});

        let putParams:any[] = [];

        for(let i = 0 ; i <= 26; i++)
        {
            putParams[i] = createOperation(i);
        }

        mockedClient.setup(c => c.send(It.is((obj: TransactWriteCommand) => matches(obj.input.TransactItems, [putParams[0], putParams[1], putParams[2], putParams[3], putParams[4], putParams[5], putParams[6], putParams[7], putParams[8], putParams[9], putParams[10], putParams[11], putParams[12], putParams[13], putParams[14], putParams[15], putParams[16], putParams[17], putParams[18], putParams[19], putParams[20], putParams[21], putParams[22], putParams[23], putParams[24]])))).callback(()=>firstBatchCalled=true).returns(()=>transactionOutput);
        mockedClient.setup(c => c.send(It.is((obj: TransactWriteCommand) => matches(obj.input.TransactItems, [putParams[25], putParams[26]])))).callback(()=>secondBatchCalled=true).returns(()=>transactionOutput);
        mockedClient.setup(c => c.send(It.isAny())).callback(()=>otherBatchCalled=true).returns(()=>transactionOutput);

        let manager = await new DynamoDbTransaction(mockedClient.object);

        for(let putParam of putParams) manager.add(putParam);

        await manager.commit();

        assert.isTrue(firstBatchCalled);
        assert.isTrue(secondBatchCalled);
        assert.isFalse(otherBatchCalled);
    });

    it('execute() - conditional check specified', async () => 
    {
        putParam.ConditionCheck = conditionalCheck;

        mockedClient.setup(c => c.send(It.is((obj: TransactWriteCommand) => matches(obj.input.TransactItems, [putParam])))).callback(()=>called=true).returns(()=>transactionOutput);

        await new DynamoDbTransaction(mockedClient.object).add(putParam).commit();

        assert.isTrue(called);
    });
});