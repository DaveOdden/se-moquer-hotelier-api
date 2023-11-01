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
      return getBookingsFromToday(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getBookingsFromToday(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let rooms = await db
          .collection(collectionName)
          .find({
            checkoutDate: {
              $gte: new Date(new Date().getTime()-60*5*1000).toISOString()
            }
          })
          .toArray();

      let arrayOfRoomsBooked: Array<any> = [];
      rooms.forEach((record: any) => {
        if(record.room._id) {
          arrayOfRoomsBooked.push(record.room._id)
        }
      });

      return res.json({
        message: {
          bookings: JSON.parse(JSON.stringify(rooms)),
          datesBooked: arrayOfRoomsBooked
        },
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