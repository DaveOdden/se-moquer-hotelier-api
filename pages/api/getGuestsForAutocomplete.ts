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
      return getGuestsForAutoComplete(req, res);
    }
  }

  async function getGuestsForAutoComplete(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let guests = await db
          .collection(collectionName)
          .find()
          .toArray();
      const modifiedGuests = guests.map((guest:any) => ({
        id: guest._id,
        label: `${guest.lastName}, ${guest.firstName}`,
        value: `${guest.lastName}, ${guest.firstName}`
      }));

      return res.json({
        message: JSON.parse(JSON.stringify(modifiedGuests)),
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