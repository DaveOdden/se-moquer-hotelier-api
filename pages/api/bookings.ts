const { connectToDatabase } = require('../../lib/mongodb');
const dayjs = require('dayjs')
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
    case 'POST': {
      return addBooking(req, res);
    }
    case 'DELETE': {
      return deleteBooking(req, res);
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
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }

  async function addBooking(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let data = JSON.parse(req.body);
      let guestId = data.guest;
      let roomId = data.room;
      data.guest = {
        _id: new ObjectId(guestId)
      }
      data.room = {
        _id: roomId
      }

      const addOneDayToDate = (_date: any) => {
        const a = dayjs(_date)
        return a.add(1, 'day')
      }
      
      let arrayOfDatesBooked: Array<any> = [];

      if(dayjs(data.checkinDate).isSame(dayjs(data.checkoutDate), 'day' )) {
        arrayOfDatesBooked.push(dayjs(data.checkinDate).format('YYYY-MM-DD'))
      }
      if(dayjs(data.checkinDate).isBefore( dayjs(data.checkoutDate), 'day') ) {
        var dateWithinRange = true;
        var cyclingDate = dayjs(data.checkinDate);
        while(dateWithinRange) {
          if(dayjs(cyclingDate).isSame(dayjs(data.checkoutDate), 'day') ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'))
            dateWithinRange = false;
            break;
          } else if( dayjs(cyclingDate).isBefore( dayjs(data.checkoutDate), 'day' ) ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'));
            cyclingDate = addOneDayToDate(cyclingDate);
          }
        }
        
      }

      // update corresponding room record with dates
      await db.collection("rooms").updateOne({
        _id: roomId
      },{ 
        $push: { "datesBooked": { $each : arrayOfDatesBooked } } 
      });

      // update corresponding guest record with history
      let bookingData = structuredClone(data);
      delete bookingData.guest;
      await db.collection("guests").updateOne({
        _id: new ObjectId(guestId)
      },{ 
        $push: { history: { action: 'New Booking', booking: bookingData } } 
      });

      // insert booking
      await db.collection(collectionName).insertOne(data);

      return res.json({
        message: 'booking added successfully',
        success: true,
      });
    } catch (error) {
      return res.json({
        message: new Error(error as any).message,
        success: false,
      });
    }
  }

  async function deleteBooking(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ) {
    try {
      let { db } = await connectToDatabase();
      let roomInfo: any;

      const addOneDayToDate = (_date: any) => {
        const a = dayjs(_date)
        return a.add(1, 'day')
      }

      let bookingInfo = await db
        .collection(collectionName)
        .findOne({
          _id: new ObjectId(req.query.id)
        })

      let arrayOfDatesBooked: Array<any> = [];
      if(dayjs(bookingInfo.checkinDate).isSame(dayjs(bookingInfo.checkoutDate), 'day' )) {
        arrayOfDatesBooked.push(dayjs(bookingInfo.checkinDate).format('YYYY-MM-DD'))
      }
      if(dayjs(bookingInfo.checkinDate).isBefore( dayjs(bookingInfo.checkoutDate), 'day') ) {
        var dateWithinRange = true;
        var cyclingDate = dayjs(bookingInfo.checkinDate);
        while(dateWithinRange) {
          if(dayjs(cyclingDate).isSame(dayjs(bookingInfo.checkoutDate), 'day') ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'))
            dateWithinRange = false;
            break;
          } else if( dayjs(cyclingDate).isBefore( dayjs(bookingInfo.checkoutDate), 'day' ) ) {
            arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'));
            cyclingDate = addOneDayToDate(cyclingDate);
          }
        }
      }

      let removeDatesFromRoom;
      if(bookingInfo.room._id) {
        removeDatesFromRoom = await db.collection('rooms').updateOne({
          _id: parseInt(bookingInfo.room._id),
        }, {
          $pull: { datesBooked: {$in: arrayOfDatesBooked } }
        });
      }

      if(removeDatesFromRoom.modifiedCount && bookingInfo.guest._id) {
        await db.collection("guests").updateOne({
          _id: new ObjectId(bookingInfo.guest._id)
        },{ 
          $push: { history: { action: 'Cancelled Booking', booking: bookingInfo } } 
        });
      }

      return res.json({
        message: 'Booking deleted successfully',
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