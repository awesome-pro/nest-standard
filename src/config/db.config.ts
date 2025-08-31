import { registerAs } from "@nestjs/config";


export default registerAs('db', () => ({
    url: process.env.DATABASE_URL! || 'mongodb://localhost:27017',
    name: process.env.DATABASE_NAME! || 'local'
}))