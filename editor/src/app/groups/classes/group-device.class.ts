import {v4 as uuidv4} from 'uuid';

export class GroupDevice {
  _id:string = uuidv4()
  token:string = uuidv4()
  key:string = uuidv4()
  claimed:boolean = false
  updatedOn:number = undefined
  registeredOn:number = undefined
  syncedOn:number = undefined
  version:string
  assignedLocation: LocationInfo = new LocationInfo()
  syncLocations: Array<LocationInfo> = []
}

class LocationInfo {
  showLevels:Array<string> = []
  value: Array<LocationNode> = []
}

class LocationNode {
  value:string = ''
  level:string = ''
}
