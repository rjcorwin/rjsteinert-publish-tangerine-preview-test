import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GroupsService } from '../services/groups.service';

@Component({
  selector: 'app-historical-releases-apk-live',
  templateUrl: './historical-releases-apk-live.component.html',
  styleUrls: ['./historical-releases-apk-live.component.css']
})
export class HistoricalReleasesApkLiveComponent implements OnInit {
  displayedColumns = ['buildId', 'build', 'releaseType', 'date', 'versionTag', 'releaseNotes'];
  groupsData: [];

  constructor(private groupsService: GroupsService, private route: ActivatedRoute) { }

  async ngOnInit() {
    const result = await this.groupsService.getGroupInfo(this.route.snapshot.paramMap.get('groupId'));
    this.groupsData = result.releases.filter(e => e.releaseType === 'prod' && e.build === 'APK');
  }

}