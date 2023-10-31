const { connectToDatabase } = require('../../lib/mongodb');
const ObjectId = require('mongodb').ObjectId;
import type { NextApiRequest, NextApiResponse } from 'next'

type ResponseData = {
  message: string
}

const collectionName = "bookings"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {

  switch (req.method) {
    case 'GET': {
      return getBookingsByRoom(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getBookingsByRoom(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let id = req.query && req.query.id ? req.query.id : '';
      let rooms = await db
          .collection(collectionName)
          .find({
            'room._id': parseInt(id.toString())
          })
          .toArray();

      return res.json({
        message: JSON.parse(JSON.stringify(rooms)),
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