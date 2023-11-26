const { connectToDatabase } = require('../../lib/mongodb');
const ObjectId = require('mongodb').ObjectId;
import type { NextApiRequest, NextApiResponse } from 'next'

type ResponseData = {
  message: string
}

const collectionName = "guests"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {

  switch (req.method) {
    case 'GET': {
      return getGuests(req, res);
    }
    case 'POST': {
      return addGuest(req, res);
    }
    case 'PUT': {
      return updateGuest(req, res);
    }
    case 'DELETE': {
      return deleteGuest(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getGuests(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let guests = await db
          .collection(collectionName)
          .find()
          .toArray();

      return res.json({
        message: JSON.parse(JSON.stringify(guests)),
        success: true,
      });
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }

  async function addGuest(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      let { db } = await connectToDatabase();
      let res = await db.collection(collectionName).insertOne(JSON.parse(req.body));
      if(await res.acknowledged) {
        return res.json({
          message: 'Guest added successfully',
          success: true,
        });
      }
      throw new Error("addGuest endpoint error");
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }

  async function updateGuest(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      let { db } = await connectToDatabase();
      let bodyJson = JSON.parse(req.body)

      let dbResult = await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(req.query.id)
        },
        { $set: bodyJson }
      );

      if(await dbResult.modifiedCount > 0) {
        return res.json({
          message: 'Guest updated successfully',
          success: true,
        });
      }
      throw new Error("updateGuest endpoint error");
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }

  async function deleteGuest(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      let { db } = await connectToDatabase();
      let dbResult = await db.collection(collectionName).deleteOne({
        _id: new ObjectId(req.query.id),
      });

      if(await dbResult.deletedCount > 0) {
        return res.json({
          message: 'Guest deleted successfully',
          success: true,
        });
      }
      throw new Error("deleteGuest endpoint error");
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }
}