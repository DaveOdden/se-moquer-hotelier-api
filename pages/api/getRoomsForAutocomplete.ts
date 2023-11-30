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
      return getRoomsForAutoComplete(req, res);
    }
  }

  async function getRoomsForAutoComplete(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      let { db } = await connectToDatabase();
      let rooms = await db
        .collection(collectionName)
        .find()
        .sort({ _id: 1 })
        .toArray();

      const modifiedRooms = rooms.map((room: any) => ({
        label: room.roomNum,
        value: room._id.toString()
      }));

      return res.json({
        data: rooms,
        keyvalpair: JSON.parse(JSON.stringify(modifiedRooms)),
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