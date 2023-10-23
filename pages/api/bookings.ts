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
      return getBookings(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getBookings(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let rooms = await db
          .collection(collectionName)
          .find()
          .toArray();

      let arrayOfRoomsBooked: Array<any> = [];
      rooms.forEach((record: any) => {
        if(record.room._id) {
          arrayOfRoomsBooked.push(record.room._id)
        }
      });

      return res.json({
        message: JSON.parse(JSON.stringify(rooms)),
        arrayOfRoomsBooked: arrayOfRoomsBooked,
        success: true,
      });
    } catch (error) {
      // return the error
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }
}