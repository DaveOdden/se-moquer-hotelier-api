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

  // switch the methods
  switch (req.method) {
    case 'GET': {
      return getGuestFormattedByFeature(req, res);
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

  async function getGuestFormattedByFeature(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    if(req.query && req.query.for && req.query.for === "keyvaluepair") {
      return getGuestsForAutoComplete(req, res);
    } else {
      return getGuests(req, res);
    }
  }

  async function getGuests(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      console.log("getGuests");
      // connect to the database
      let { db } = await connectToDatabase();
      // fetch the posts
      let guests = await db
          .collection(collectionName)
          .find()
          .toArray();
      // return the guests
      console.log(guests);
      return res.json({
        message: JSON.parse(JSON.stringify(guests)),
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

  async function getGuestsForAutoComplete(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      // connect to the database
      let { db } = await connectToDatabase();
      // fetch the posts
      let guests = await db
          .collection(collectionName)
          .find()
          .toArray();
      const modifiedGuests = guests.map((guest:any) => ({
        label: `${guest.lastName}, ${guest.firstName}`,
        value: `${guest.lastName}, ${guest.firstName}`
      }));
      // return the guests
      return res.json({
        guests: guests,
        message: JSON.parse(JSON.stringify(modifiedGuests)),
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

  async function addGuest(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      // connect to the database
      let { db } = await connectToDatabase();
      // add the post
      await db.collection(collectionName).insertOne(JSON.parse(req.body));
      // return a message
      return res.json({
        message: 'Guest added successfully',
        success: true,
      });
    } catch (error) {
      // return an error
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
      // connect to the database
      let { db } = await connectToDatabase();
      let bodyJson = JSON.parse(req.body)

      // update the published status of the post
      await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(req.query.id)
        },
        { $set: bodyJson }
      );

      // return a message
      return res.json({
        message: 'Guest updated successfully',
        success: true,
      });
    } catch (error) {

      // return an error
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
      // Connecting to the database
      let { db } = await connectToDatabase();

      // Deleting the post
      await db.collection(collectionName).deleteOne({
        _id: new ObjectId(req.query.id),
      });

      // returning a message
      return res.json({
        message: 'Guest deleted successfully',
        success: true,
      });
    } catch (error) {

      // returning an error
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }
}