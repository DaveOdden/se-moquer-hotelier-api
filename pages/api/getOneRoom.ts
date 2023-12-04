const { connectToDatabase } = require('../../lib/mongodb');
const ObjectId = require('mongodb').ObjectId;
import type { NextApiRequest, NextApiResponse } from 'next'

type ResponseData = {
  message: string
}

const collectionName = "rooms"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {

  switch (req.method) {
    case 'GET': {
      return getOneRoom(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({ message: 'ok' });
    }
  }

  async function getOneRoom(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let guest = await db
        .collection(collectionName)
        .findOne({
          _id: parseInt(req.query.id as any)
        })

      return res.json({
        message: JSON.parse(JSON.stringify(guest)),
        success: true,
      });
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }
}