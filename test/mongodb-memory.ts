import { MongoMemoryServer } from 'mongodb-memory-server';
import * as sinon from 'sinon';
import * as config from 'config';
let mongod;

beforeAll(async () => {
  mongod = new MongoMemoryServer();
  const uri = await mongod.getConnectionString();
  const configStub = sinon.stub(config, 'get');
  configStub.withArgs('MONGO_URI').returns(uri);
  configStub.callThrough();
});

afterAll(async () => {
  await mongod.stop();
});
