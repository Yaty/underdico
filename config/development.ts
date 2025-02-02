import { Config } from './config.interface';

const config: Config = {
  HOST: '0.0.0.0',
  PORT: '3000',
  MONGO_URI: 'mongodb://127.0.0.1:27017/underdico',
  // tslint:disable-next-line:max-line-length
  JWT_SECRET: 'vFP8CTP9svUPYHD/rBnzdh2kTDxj3ZllnvsYGTo1oz7QL0e2y3NuEejHFO/Gzp5d+HHgHHXD9twTo0Rj5ssQrwRxVieANBLkIxkAhTFPAHJPGXbtJZvfIS2b64SQFkFY7GIWrIhRvc6XHuFlPi+RtmvNmze/8AwwowL4/q32mrQF/xqOszS82DJL94GjB1HNOvw8W+oPL9XIHBzZB00eBjgKnVN0oYcRXL9JQPThyTTx1ArTCVbpnQHNXcCDjgUyxVO7kfU7sTJIwWFJrLmodpgwLBNaYgkSMSzWN+3HGP9QfielN2VmIrKSWAZGVePtx8DLk39cvaqjOAFbXrdROg==',
  JWT_ALGORITHM: 'HS256',
  JWT_EXPIRATION: '1h',
  JWT_ISSUER: 'underdico.com',
  GOOGLE_CLOUD_STORAGE_BUCKET: 'underdico',
  GOOGLE_CLOUD_PROJECT_ID: 'underdico',
  GOOGLE_CLOUD_STORAGE_CLIENT_EMAIL: '205455575954-compute@developer.gserviceaccount.com',
  // tslint:disable-next-line:max-line-length
  GOOGLE_CLOUD_STORAGE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCdx+UUPiltYzaY\nnUJoE3yPBQnFMiWr2sPoluWRTBwwzCfMViSv9Np8vyUbEdJZCSqtJjDyJnIGhk4D\nklzD5OajDOxxaIk5sb5w8MKeyf9D2zVQ32MS8obHqlt/ex91zeTR98j4xnnbE5Vw\nawaSx8fGQftc2iyeaYxn9dhQhBtijPS+6l1E3kxJIVVr52vjcnM44mE6ihuaNQD7\njW3iTsMe3UdfEPVpzkoLTE17hPCHpKaUJxG4vBG63P8phvTTSYn9L8ra+XnrIQP/\nyOFBL2juvCOX1CThu+WhLzOPd6Yw2ET+QhSYv4chwBCNjLS4t/+ZsR27nGg2dqYm\nS80fvnp/AgMBAAECggEABCff3pof4OE0RBh0R3sn6ePHP5npXcRBKmRQafTNaJ2f\n+LpWH1+oIjwDSq9mpnC0M+Oly2L8LYl7uY1b2Hm0IhxKMqx/B3V+ih6qnvW8Evn4\nRrKI5gFcT8WqwPSpvffCgfia+Fkl8YFrtg547wRzEcOVeXsc92kunmMJI7RvEjfl\n+FsJIyNI3js5BwCluBAMGuZsGCCHER7TM5imKhTGgut5fEU/PrhH/iVip5rSOvrO\nu/tIHXzcdmFZ/p4HCyHYznkSlzubCJJY7Bh641h6ekRipwBtA7xnnR6JKrsPmO0N\nSEsWOte/Ula+7f430mUVki+W9pnoUO6j1sryunOWQQKBgQDMXQLWIvN8wxtX3SZD\njPkTAsLIttdoHOXuqdWtGfDOxtd8j/yDGQlrReTuZS7LdiuYRnpRuIgxgkeFDpVz\nWL6qK6GYrOzypLAq6o23+quoqkdX+9Cek2Pyo4krN0OSoNCzh+KpN7hcycMET8oh\nFD+RGlqCi2qHY691KCBwLUTCvwKBgQDFpcDYjRqwDkDUUexhZ31hQeKLTtVzM6qg\njkxKsoaNPhiRIZPQXu2lu9TZtm+UNAwRq+uqp36naK/rKwf/6P80TiZlvrEbpzpS\nZ8C8yoa+TZKXi9Y9VyesXn6dc27hXPcy8Mso8tcjtORQrGxp+gHXe3u1uznGf4ko\n0kDKQ2D4QQKBgCoWabQiJJUoNWRmBjBZQx6YLfdaOIiXkv8Q+RGaSw66wrxDhxSU\nvmzaSyiRrA54+sd0lFJqN5pCo2oSs9K6jyHKtJAV5QKfyiw8fA1M0bd9wg2rra5K\n2oWpCmHdEsyK1BB1Rsfk0tJBNymXKSCg4+qFS+igv8K8U/FD31Ja8FNPAoGBALxR\nCOSL1VDH09c401ufSmQfbWXEUDX6lWlzC5fkb7Ul5Cxr7LWNrSrLQ6vIWpm/2XwA\n7YNlIZUKdws/rdiUPIyupYEt5vvtIvGfL5Hx+d5adQD12MQLRZ7DTipg8NXDSTj9\nGuVCM+Aum5eOIaH79kNEwYNPB2Zs39fINLlC56LBAoGAJG0vzKBjznuiB5zD6jIK\nIzX4TEJ9XqnvB8+Eix2YTQ4ZZv2LULnIOQatIwmOPKoY2hB0wSbOOWZ3gcNNOodb\nXYR2Lp24v2/V0uR6t03Ba2EoE9m2TfbaWpw3SZqXEMGEIJzjkawiG0+G6Jiafkhx\nehPV3yZNEOn9qlwpcpCX9AI=\n-----END PRIVATE KEY-----\n',
  REDIS_DB: '1',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PREFIX: 'underdico',
  ADMIN_PASSWORD: 'admin12',
  ADMIN_EMAIL: 'admin@email.com',
};

export default config;
