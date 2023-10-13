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
      return getPosts(req, res);
    }

    case 'POST': {
      return addPost(req, res);
    }

    case 'PUT': {
      return updatePost(req, res);
    }

    case 'DELETE': {
      return deletePost(req, res);
    }
  }

  async function getPosts(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      // connect to the database
      let { db } = await connectToDatabase();
      // fetch the posts
      let posts = await db
          .collection(collectionName)
          .find({})
          .sort({ published: -1 })
          .toArray();
      // return the posts
      return res.json({
        message: JSON.parse(JSON.stringify(posts)),
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

  async function addPost(
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

  async function updatePost(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      // connect to the database
      let { db } = await connectToDatabase();

      // update the published status of the post
      await db.collection(collectionName).updateOne(
        {
          _id: new ObjectId(req.body),
        },
        { $set: { published: true } }
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

  async function deletePost(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      // Connecting to the database
      let { db } = await connectToDatabase();

      // Deleting the post
      await db.collection(collectionName).deleteOne({
        _id: new ObjectId(req.body),
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