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
      return getBookingsByRoom(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getBookingsByRoom(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let id = req.query && req.query.id ? req.query.id : '';
      let rooms = await db
          .collection(collectionName)
          .find({
            'room._id': parseInt(id.toString())
          })
          .toArray();

      const addOneDayToDate = (_date: any) => {
        const a = dayjs(_date)
        return a.add(1, 'day')
      }
      
      let arrayOfDatesBooked: Array<any> = [];
      rooms.forEach((record: any) => {
        if(dayjs(record.checkinDate).isSame(dayjs(record.checkoutDate), 'day' )) {
          arrayOfDatesBooked.push(dayjs(record.checkinDate).format('YYYY-MM-DD'))
        }
        if(dayjs(record.checkinDate).isBefore( dayjs(record.checkoutDate), 'day') ) {
          var dateWithinRange = true;
          var cyclingDate = dayjs(record.checkinDate);
          while(dateWithinRange) {
            if(dayjs(cyclingDate).isSame(dayjs(record.checkoutDate), 'day') ) {
              arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'))
              dateWithinRange = false;
              break;
            } else if( dayjs(cyclingDate).isBefore( dayjs(record.checkoutDate), 'day' ) ) {
              arrayOfDatesBooked.push(dayjs(cyclingDate).format('YYYY-MM-DD'));
              cyclingDate = addOneDayToDate(cyclingDate);
            }
          }
          
        }
      });

      return res.json({
        message: {
          bookings: JSON.parse(JSON.stringify(rooms)),
          datesBooked: arrayOfDatesBooked
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