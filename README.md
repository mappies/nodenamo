# nodenamo
A lightweight, high-level ORM for DynamoDB that will make you fall in love with DynamoDB.


[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fmappies%2Fnodenamo%2Fbadge&style=popout-square)](https://actions-badge.atrox.dev/mappies/nodenamo/goto)


## Introduction

Nodenamo is a lightweight ORM framework for DynamoDB that is designed to wrap DynamoDB logics and allowed you to focus on designing data models and queries instead. 

## Example

A simple usecase without any hash/range keys

```javascript

import { DBTable, DBColumn, NodeNamo } from 'nodenamo';
import { DocumentClient } from "aws-sdk/clients/dynamodb";

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

let nodenamo = new NodeNamo(new DocumentClient());

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
1. The DynamoDB table must have the following schema:
    1. A partition key named `hash` of type string.
    1. A sort key named `range` of type string.
    1. A GSI named `objid-index` for a string property `objid` and projects all.

## Operations

### Table creation
Create a table in DynamoDB to store a certain class of objects.

#### Example

```javascript
await nodenamo.createTable().for(T).execute();
```
where:
 * T is a class decorated with `@DBTable()`

### Table deletion
Delete a table in DynamoDB that is used to store a certain class of objects.

#### Example

```javascript
await nodenamo.deleteTable().for(T).execute();
```
where:
 *  `T` is a class decorated with `@DBTable()`


### Insert

Insert an object into DynamoDB

```javascript
await nodenamo.insert(obj).into(T).execute();
```

where:
 * `obj` is an object created from a class decorated with `@DBTable()`
 * `T` is a class decorated with `@DBTable()`


### Get

Get an object from DynamoDB by the object's ID

```javascript
await nodenamo.get(id).from(T).execute();
```

where:
 * `id` is the ID of an object to be deleted.  The `id` is the value of a property that is tagged with `@DBColumn{id:true}`
 * `T` is a class decorated with `@DBTable()`

 ### Delete

Delete an object from DynamoDB by the object's ID.

```javascript
await nodenamo.delete(id).from(T).execute();
```

where:
 * `id` is the ID of an object to be deleted.  The `id` is the value of a property that is tagged with `@DBColumn{id:true}`
 * `T` is a class decorated with `@DBTable()`