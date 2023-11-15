const { connectToDatabase } = require('../../lib/mongodb');
const dayjs = require('dayjs')
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
      return getCurrentlyOccupiedRooms(req, res);
    }
  }

  async function getCurrentlyOccupiedRooms(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let bookedRooms = await db
        .collection(collectionName)
        .find({
          datesBooked: dayjs(new Date()).format('YYYY-MM-DD')
        })
        .toArray();

      return res.json({
        message: JSON.parse(JSON.stringify(bookedRooms)),
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