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
      return getRoomsFormattedByFeature(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getRoomsFormattedByFeature(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    if(req.query && req.query.for && req.query.for === "keyvaluepair") {
      return getRoomsForAutoComplete(req, res);
    } else {
      return getRooms(req, res);
    }
  }

  async function getRooms(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let rooms = await db
          .collection(collectionName)
          .find()
          .sort({_id:1})
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

  async function getRoomsForAutoComplete(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      // connect to the database
      let { db } = await connectToDatabase();
      // fetch the posts
      let rooms = await db
          .collection(collectionName)
          .find()
          .toArray();
      const modifiedRooms = rooms.map((room:any) => ({
        label: room.roomNum,
        value: `${room.roomNum}${room.status.occupied ? ' (occupied)' : ''}`
      }));
      // return the guests
      return res.json({
        message: JSON.parse(JSON.stringify(modifiedRooms)),
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