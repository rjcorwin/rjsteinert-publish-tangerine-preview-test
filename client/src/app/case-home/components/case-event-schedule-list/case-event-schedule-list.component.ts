import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { UserService } from 'src/app/shared/_services/user.service';
import { CasesService } from 'src/app/case/services/cases.service';
import * as moment from 'moment'
import { FORM_TYPES_INFO } from 'src/app/core/search/search.component';
import {  CASE_EVENT_STATUS_COMPLETED } from 'src/app/case/classes/case-event.class';
import { TangyFormsInfoService } from 'src/app/tangy-forms/tangy-forms-info-service';
import { TangyFormResponse } from 'src/app/tangy-forms/tangy-form-response.class';
import { SearchDoc, SearchService } from 'src/app/shared/_services/search.service';
import { FormInfo } from 'src/app/tangy-forms/classes/form-info.class';
import { Subject } from 'rxjs';
import { CaseService } from 'src/app/case/services/case.service';
import { CaseEventInfo } from 'src/app/case/services/case-event-info.class';
import { CaseDefinition } from 'src/app/case/classes/case-definition.class';

export const CASE_EVENT_SCHEDULE_LIST_MODE_DAILY = 'CASE_EVENT_SCHEDULE_LIST_MODE_DAILY'
export const CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY = 'CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY'

class EventInfo {
  newDateNumber = ''
  newDateLabel = ''
  openLink = ''
  caseDefinition: CaseDefinition
}

@Component({
  selector: 'app-case-event-schedule-list',
  templateUrl: './case-event-schedule-list.component.html',
  styleUrls: ['./case-event-schedule-list.component.css']
})
export class CaseEventScheduleListComponent implements OnInit {

  formTypesInfo = FORM_TYPES_INFO
  eventsInfo:Array<EventInfo> = []
  formsInfo:Array<FormInfo>
  didSearch$ = new Subject()

  private _date = Date.now()
  @Input()
  set date(date:number) {
    this._date = date
    this.calculateEvents()
  }

  private _mode = CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY
  @Input()
  set mode(mode:string) {
    if (this._mode === mode) {
      return;
    }
    this._mode = mode
    this.calculateEvents()
  }

  constructor(
    private casesService:CasesService,
    private userService:UserService,
    private searchService:SearchService,
    private formsInfoService:TangyFormsInfoService,
    private caseService:CaseService,
    private ref: ChangeDetectorRef
  ) {
    ref.detach()
  }

  async ngOnInit() {
  }

  async calculateEvents() {
    let startDate = Date.now()
    let endDate = Date.now()
    let excludeEstimates = false
    const d = new Date(this._date)
    /**
     * The date widget gets the unix representation of the time at the date and time of selecting the date.
     * Thus we change the date we get to YYYY-MM-DD so as to get the unix milliseconds representation of the date.
     * We do not want the time part of the date as it will lead to subtle errors(off by one)
     * We are only interested in the YYYY-MM-DD of the date.
     */
    const _date = [ d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-')
    if (this._mode === CASE_EVENT_SCHEDULE_LIST_MODE_DAILY) {
      startDate = new Date(_date).getTime()
      endDate = startDate + (1000*60*60*24)
      excludeEstimates = false
    } else if (this._mode === CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY) {
      const beginningOfWeek = moment(moment(new Date(_date)).format('YYYY w'), 'YYYY w').unix()*1000
      const endOfWeek = beginningOfWeek + (1000*60*60*24*7)
      startDate = beginningOfWeek
      endDate = endOfWeek
      excludeEstimates = false
    }
    const events = <Array<any>>await this.casesService.getEventsByDate(startDate, endDate, excludeEstimates)
    this.render(events)
  }

  async render(events:Array<any>) {
    // Get some data together before rendering.
    const userDb = await this.userService.getUserDatabase(this.userService.getCurrentUser())
    const searchDocs:Array<SearchDoc> = []
    const responses:Array<TangyFormResponse> = []
    const uniqueCaseIds = events.reduce((uniqueCaseIds, caseEventInfo) => {
      return uniqueCaseIds.indexOf(caseEventInfo.caseId) === -1
        ? [...uniqueCaseIds, caseEventInfo.caseId]
        : uniqueCaseIds
    }, [])
    for (const caseId of uniqueCaseIds) {
      searchDocs.push(await this.searchService.getIndexedDoc(this.userService.getCurrentUser(), caseId))
      responses.push(await userDb.get(caseId))
    }
    const formsInfo = await this.formsInfoService.getFormsInfo()
    // Render.
    let markup = ``
    let daysOfWeekSeen = []
    const eventsInfo =  []
    for (let eventInstance of events) {
      const eventInfo = <EventInfo>{}
      const date = eventInstance.occurredOnDay || eventInstance.scheduledDay || eventInstance.estimatedDay || eventInstance.windowStartDay
      if (daysOfWeekSeen.indexOf(date) === -1) {
        daysOfWeekSeen.push(date)
        eventInfo.newDateLabel = moment(date).format('ddd')
        eventInfo.newDateNumber = this._mode === CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY 
          ? moment(date).format('D') 
          : ``
      }
      // Note this rendering is a bit crufty. Could be simplified. CaseDefinition is being overloaded with things it shouldn't have.
      eventInfo.openLink = `/case/event/${eventInstance.caseId}/${eventInstance.id}`
      eventInfo.caseDefinition = await this.getCaseDefinition(eventInstance)
      eventsInfo.push(eventInfo)
    }
    this.eventsInfo = eventsInfo
    this.ref.detectChanges()
    this.didSearch$.next(true)
  }

  async getCaseDefinition(caseEventInfo:CaseEventInfo){
      if(!caseEventInfo.caseDefinition) return
    let templateScheduleListItemIcon, templateScheduleListItemPrimary,templateScheduleListItemSecondary,caseEventDefinition;
    const caseDefinition = caseEventInfo.caseDefinition;
    caseEventDefinition = caseDefinition.eventDefinitions.find(({id}) => id === caseEventInfo.caseEventDefinitionId)
    const caseInstance = caseEventInfo.caseInstance;
    const caseService =this.caseService
    await caseService.load(caseInstance._id)
    const caseEvent = caseService.case.events.find(caseEvent => caseEvent.id === caseEventInfo.id)
    const defaultTemplateScheduleListItemIcon = `${caseEventInfo.status === CASE_EVENT_STATUS_COMPLETED ? 'event_note' : 'event_available'}`
    const defaultTemplateScheduleListItemPrimary = '<span>${caseEventDefinition.name}</span> in Case ${caseService.case._id.substr(0,5)}'
    const defaultTemplateScheduleListItemSecondary = '<span>${caseInstance.label}</span>'
    eval(`templateScheduleListItemIcon = caseDefinition.templateScheduleListItemIcon ? \`${caseDefinition.templateScheduleListItemIcon}\` : \`${defaultTemplateScheduleListItemIcon}\``)
    eval(`templateScheduleListItemPrimary = caseDefinition.templateScheduleListItemPrimary ? \`${caseDefinition.templateScheduleListItemPrimary}\` : \`${defaultTemplateScheduleListItemPrimary}\``)
    eval(`templateScheduleListItemSecondary = caseDefinition.templateScheduleListItemSecondary ? \`${caseDefinition.templateScheduleListItemSecondary}\` : \`${defaultTemplateScheduleListItemSecondary}\``)
    return {
      ...caseDefinition,
      templateScheduleListItemIcon,
      templateScheduleListItemPrimary,
      templateScheduleListItemSecondary
    }
   
  }

}
