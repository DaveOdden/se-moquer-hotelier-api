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
      return getRoomsByAvailability(req, res);
    }
    case 'OPTIONS': {
      return res.status(200).send({message: 'ok'});
    }
  }

  async function getRoomsByAvailability(
    req: NextApiRequest,
    res: NextApiResponse<any>
  ){
    try {
      let { db } = await connectToDatabase();
      let checkinDate = req.query && req.query.checkin ? req.query.checkin : '';
      let checkoutDate = req.query && req.query.checkout ? req.query.checkout : '';
      let rooms = await db
          .collection(collectionName)
          .find()
          .sort({_id:1})
          .toArray();
      
      const startDate = dayjs(checkinDate)
      const endDate = dayjs(checkoutDate)
      let countOfDays = endDate.diff(checkinDate, 'day', true)

      let arrayOfDatesStaying: Array<any> = []
      for(let x = 0; x <= countOfDays; x++) {
        if(x === 0) {
          arrayOfDatesStaying.push(startDate.format('YYYY-MM-DD'))
        } else {
          arrayOfDatesStaying.push(startDate.add(x, 'day').format('YYYY-MM-DD'))
        }
      }

      let roomsWithAvailability: Array<any> = [];
      rooms.forEach((room: any) => {
        let roomIsOccupied = false;
        if(room.hasOwnProperty('datesBooked')) {
          for(let y = 0; y < arrayOfDatesStaying.length; y++) {
            console.log(room.datesBooked.indexOf(arrayOfDatesStaying[y]) + ' -> ' + arrayOfDatesStaying[y])
            if(room.datesBooked.indexOf(arrayOfDatesStaying[y]) > -1) {
              roomIsOccupied = true
              break;
            }
          }
          if(!roomIsOccupied) {
            roomsWithAvailability.push(room)
          }
        } else {
          roomsWithAvailability.push(room)     
        }
      });

      const roomsWithAvailabilityKeyVal = roomsWithAvailability.map((room:any) => ({
        label: room.roomNum,
        value: room.roomNum,
        id: room._id
      }));

      return res.json({
        message: {
          roomsWithAvailability: roomsWithAvailability,
          roomsWithAvailabilityKeyVal: roomsWithAvailabilityKeyVal
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