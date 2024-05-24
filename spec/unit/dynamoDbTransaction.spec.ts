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

    it('execute() - more than 100 operations', async () => 
    {
        let firstBatchCalled = false;
        let secondBatchCalled = false;
        let otherBatchCalled = false;

        let createOperation = (item:any) => ({ Put: {TableName: 'table', Item: item}});

        let putParams:any[] = [];

        const defaultMaxTransactions = 100;

        for(let i = 0 ; i <= defaultMaxTransactions + 1; i++)
        {
            putParams[i] = createOperation(i);
        }

        const batch1 = putParams.slice(0, defaultMaxTransactions);
        const batch2 = putParams.slice(defaultMaxTransactions);

        mockedClient.setup(c => c.send(It.is((obj: TransactWriteCommand) => matches(obj.input.TransactItems, batch1)))).callback(()=>firstBatchCalled=true).returns(()=>transactionOutput);
        mockedClient.setup(c => c.send(It.is((obj: TransactWriteCommand) => matches(obj.input.TransactItems, batch2)))).callback(()=>secondBatchCalled=true).returns(()=>transactionOutput);
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