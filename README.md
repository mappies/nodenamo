# nodenamo
A lightweight, high-level ORM for DynamoDB that will make you fall in love with DynamoDB.


![Tests](https://github.com/mappies/nodenamo/workflows/Tests/badge.svg)


## Introduction

Nodenamo is a lightweight ORM framework for DynamoDB that is designed to wrap DynamoDB logics and allowed you to focus on designing data models and queries instead. 

## Example

A simple usecase without any hash/range keys

```javascript

import { DBTable, DBColumn, NodeNamo } from 'nodenamo';

@DBTable()
class User
{
    @DBColumn({id:true})
    id:number

    @DBColumn()
    name:string

    @DBColumn()
    email:string

    constructor(id?:number, name?:string, email?:string)
    {
        this.id = id;
        this.name = name;
        this.email = email;
    }
}

let nodenamo = new NodeNamo({ region: 'us-east-1' });

//Create a table
await nodenamo.createTable().for(User).execute();

//Insert a user
let user = new User(1, 'Some One', 'some.one@example.com');

await nodenamo.insert(user).into(User).execute();

//Get a user by 'id'
let user1 = await nodenamo.get(1).from(User).execute<User>();  
    /* Returns User { id: 1, name: 'Some One', email: 'some.one@example.com' } */

//Update the user
user1.name = 'This One';
await nodenamo.update(user1).from(User).execute(); 
    /* Returns { items: [ User { id: 1, name: 'This One', email: 'some.one@example.com' } ],
                 lastEvaluatedKey: undefined } */

//List all users
let users = await nodenamo.list().from(User).execute<User>();

//Delete the user by id
await nodenamo.delete(1).from(User).execute();
```

## Requirements

Because nodenamo manages the DynamoDB table for you, it has the following requirements:

1. Data to be inserted into the database must be defined as a class decorated with `@DBTable()`
1. Properties to be saved into the database must be decorated with `@DBColumn()`
1. At least, one of the properties must be decorated with `@DBColumn({id:true})` to represent a unique ID.
1. The DynamoDB table must be created using the `nodenamo.createTable()` function or be manually created using the following schema:
    1. A partition key named `hash` of type string.
    1. A sort key named `range` of type string.
    1. A GSI named `objid-index` for a string property `objid` and projects all.

## Operations

1. <a href='#TableCreation'>Table creation</a>
1. <a href='#TableDeletion'>Table deletion</a>
1. <a href='#Insert'>Insert an object</a>
1. <a href='#Get'>Get an object</a>
1. <a href='#List'>List objects</a>
1. <a href='#Find'>Find objects</a>
1. <a href='#Update'>Update an object</a>
1. <a href='#Delete'>Delete an object</a>
1. <a href='#Transaction'>Transaction</a>

### Table creation <a name='TableCreation'></a>
Create a table in DynamoDB to store a certain class of objects.

#### Example

```javascript
await nodenamo.createTable().for(T).execute();
```
where:
 * T is a class decorated with `@DBTable()`

### Table deletion <a name='TableDeletion'></a>
Delete a table in DynamoDB that is used to store a certain class of objects.

#### Example

```javascript
await nodenamo.deleteTable().for(T).execute();
```
where:
 *  `T` is a class decorated with `@DBTable()`


### Insert an object <a name='Insert'></a>

Insert an object into DynamoDB

```javascript
await nodenamo.insert(obj).into(T).execute();
```

where:
 * `obj` is an object created from a class decorated with `@DBTable()`
 * `T` is a class decorated with `@DBTable()`


### Get an object <a name='Get'></a>

Get an object from DynamoDB by the object's ID

```javascript
// Get an object
await nodenamo.get(id).from(T).execute<T>();
// Get an object with a strongly consistent read
await nodenamo.get(id).from(T).stronglyConsistent(true).execute<T>();
```

where:
 * `id` is the ID of an object to be deleted.  The `id` is the value of a property that is tagged with `@DBColumn{id:true}`
 * `T` is a class decorated with `@DBTable()`

### List objects <a name='List'></a>

List objects from DynamoDB. 

```javascript
//List all objects from T
await nodenamo.list().from(T).execute<T>();
//List all objects from T with a strongly consistent read
await nodenamo.list().from(T).stronglyConsistent(true).execute<T>();
//List all objects from T that have a certain hash. 
await nodenamo.list().from(T).by(hash).execute<T>();
//List all objects from T that have a certain hash and start with a certain range key value. 
await nodenamo.list().from(T).by(hash, range).execute<T>();

/***
 * Paging
 **/
//List the top 10 objects from T 
let page = await nodenamo.list().from(T).limit(10).execute<T>();
//List the next 10 objects from T and sorted in a reverse order
await nodenamo.list().from(T).limit(10).resume(page.lastEvaluatedKey).execute<T>();();

/***
 * Ordering
 **/
//List all objects from T and sorted in a reverse order
await nodenamo.list().from(T).order(false).execute<T>

/***
 * Custom index.
 **/
await nodenamo.list().from(T).using(indexName).execute<T>();

/***
 * All operations above can be chained together.
 ***/
await nodenamo.list()
              .from(T)
              .by(hash, range)
              .limit(10)
              .using(indexName)
              .order(false)
              .resume(page.lastEvaluatedKey)
              .stronglyConsistent(true)
              .execute<T>();

```

where:
 * `T` is a class decorated with `@DBTable()`
 * `hash` is the value of a hash key defined by `@DBColumn({hash:true})`
 * `range` is the prefix value of a range key defined by `@DBColumn({range:true})`
 * `indexName` is the name of an index to be used with the query.

 ### Delete an object<a name='Delete'></a>

Delete an object from DynamoDB by the object's ID.

```javascript
await nodenamo.delete(id).from(T).execute();
```

where:
 * `id` is the ID of an object to be deleted.  The `id` is the value of a property that is tagged with `@DBColumn{id:true}`
 * `T` is a class decorated with `@DBTable()`