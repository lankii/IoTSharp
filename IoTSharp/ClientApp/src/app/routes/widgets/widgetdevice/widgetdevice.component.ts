import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { STColumn, STColumnTag, STRes, STComponent } from '@delon/abc/st';
import { G2TimelineMap } from '@delon/chart/timeline';
import { _HttpClient, SettingsService } from '@delon/theme';
import { getTimeDistance, toDate } from '@delon/util';
import { Guid } from 'guid-typescript';

import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { forkJoin, interval, Subscription, zip, pipe, from } from 'rxjs';
import { groupBy, map, mergeMap, reduce } from 'rxjs/operators';
import { element } from 'screenfull';

import { appmessage } from '../../common/AppMessage';
import { attributeitem, deviceitem, ruleitem, telemetryitem } from '../../device/devicemodel';
@Component({
  selector: 'app-widgetdevice',
  templateUrl: './widgetdevice.component.html',
  styleUrls: ['./widgetdevice.component.less']
})
export class WidgetdeviceComponent implements OnInit, OnDestroy {
  @Input() id: string = Guid.EMPTY;
  device: any;
  initaldatarange = getTimeDistance(-1);
  cetd: telemetryitem[] = [];
  cead: attributeitem[] = [];
  cerd: ruleitem[] = [];
  singlechartdata: any[] = [];
  singletitlemap:any={y1:'y1'};
  singlechartAxis:number=1;
  singlechart=true;
  // alarm

  @ViewChild('stalarm', { static: true })
  stalarm!: STComponent;
  alarmapi = 'api/alarm/list';
  erveritybadge: STColumnTag = {
    Indeterminate: { text: '不确定', color: '#8c8c8c' },
    Warning: { text: '警告', color: '#faad14' },
    Minor: { text: '次要', color: '#bae637' },
    Major: { text: '主要', color: '#1890ff' },
    Critical: { text: '错误', color: '#f5222d' }
  };

  alarmstatusTAG: STColumnTag = {
    Active_UnAck: { text: '激活未应答', color: '#ffa39e' },
    Active_Ack: { text: '激活已应答', color: '#f759ab' },
    Cleared_UnAck: { text: '清除未应答', color: '#87e8de' },
    Cleared_Act: { text: '清除已应答', color: '#d3f261' }
  };
  originatorTypeTAG: STColumnTag = {
    Unknow: { text: '未知', color: '#ffa39e' },
    Device: { text: '设备', color: '#f759ab' },
    Gateway: { text: '网关', color: '#87e8de' },
    Asset: { text: '资产', color: '#d3f261' }
  };

  serveritybadge: STColumnTag = {
    Indeterminate: { text: '不确定', color: '#8c8c8c' },
    Warning: { text: '警告', color: '#faad14' },
    Minor: { text: '次要', color: '#bae637' },
    Major: { text: '主要', color: '#1890ff' },
    Critical: { text: '错误', color: '#f5222d' }
  };

  columns: STColumn[] = [
    { title: '', index: 'Id', type: 'checkbox' },
    // { title: 'id', index: 'id' },
    {
      title: '告警类型',
      index: 'alarmType'
    },
    { title: '创建时间', index: 'ackDateTime', type: 'date' },
    { title: '警告持续的开始时间', index: 'startDateTime', type: 'date' },
    { title: '警告持续的结束时间', index: 'endDateTime', type: 'date' },
    { title: '清除时间', index: 'clearDateTime', type: 'date' },
    { title: '告警状态', index: 'alarmStatus', type: 'tag', tag: this.alarmstatusTAG },
    { title: '严重程度', index: 'serverity', type: 'tag', tag: this.serveritybadge },
    { title: '设备类型', index: 'originatorType', type: 'tag', tag: this.originatorTypeTAG }
  ];
  res: STRes = {
    reName: {
      total: 'data.total',
      list: 'data.rows'
    }
  };
  qal: {
    pi: number;
    ps: number;
    sorter: string;
    status: number | null;
    Name: string;
    AckDateTime: any;
    ClearDateTime: any;
    EndDateTime: any;
    StartDateTime: any;
    AlarmType: any;
    alarmStatus: any;
    OriginatorId: any;
    OriginatorName: string;
    serverity: any;
    originatorType: any;
  } = {
    pi: 0,
    ps: 10,
    Name: '',
    sorter: '',
    status: null,
    AckDateTime: null,
    ClearDateTime: null,
    StartDateTime: null,
    EndDateTime: null,
    AlarmType: '',
    OriginatorName: '',
    alarmStatus: '-1',
    OriginatorId: this.id,
    serverity: '-1',
    originatorType: '1'
  };
  alarmerq = { method: 'POST', allInBody: true, reName: { pi: 'offset', ps: 'limit' }, params: this.qal };

  //events
  eventsurl = 'api/rules/flowevents';

  qevent: {
    pi: number;
    ps: number;
    Name: string;
    Creator: string;
    RuleId: string;
    CreatorName: string;
    CreatTime: Date[];
    sorter: string;
    status: number | null;
  } = {
    pi: 0,
    ps: 10,
    Name: '',
    Creator: '',
    RuleId: '',
    CreatorName: '',
    CreatTime: [],
    sorter: '',
    status: null
  };
  eventreq = { method: 'POST', allInBody: true, reName: { pi: 'offset', ps: 'limit' }, params: this.qevent };
  eventtag: STColumnTag = {
    Normal: { text: '设备', color: 'green' },
    TestPurpose: { text: '测试', color: 'orange' }
  };

  @ViewChild('stevent', { static: true })
  stevent!: STComponent;
  eventcolumns: STColumn[] = [
    { title: '', index: 'eventId', type: 'checkbox' },
    { title: '事件名称', index: 'eventName', render: 'name' },
    { title: '类型', index: 'type', type: 'tag', tag: this.eventtag },
    { title: '触发规则', index: 'name' },
    { title: '事件源', index: 'creatorName' },
    { title: '创建时间', type: 'date', index: 'createrDateTime' }
  ];

  //temphistory

  @ViewChild('sttemps', { static: true })
  sttemps!: STComponent;
  apitemps = '';

  qtemps: {
    pi: number;
    ps: number;
    deviceId: string;
    keys: string | any;
    end: string | Date;

    begin: string | Date;
    sorter: string;
    status: number | null;
  } = {
    pi: 0,
    deviceId: this.id,
    ps: 10,
    keys: '',
    begin: this.initaldatarange[0].toISOString(),
    end: this.initaldatarange[1].toISOString(),
    sorter: '',
    status: null
  };
  rqtemps = { method: 'GET', allInBody: true, reName: { pi: 'offset', ps: 'limit' }, params: this.qtemps };

  tempscolumns: STColumn[] = [
    { title: '名称', index: 'keyName', render: 'name' },
    { title: '值', index: 'value' },
    { title: '类型', index: 'dataType' },
    { title: '时间', type: 'date', index: 'dateTime' }
  ];

  restemps: STRes = {
    reName: {
      list: 'data'
    }
  };

  obs: Subscription;
  averagetempdata: attributeitem[] = [];
  tempcharts: tempchartitem[] = [];
  constructor(
    private _router: ActivatedRoute,
    private http: _HttpClient,
    private settingService: SettingsService,
    private drawerService: NzDrawerService,private cdr: ChangeDetectorRef,
  ) {}
  ngOnDestroy(): void {
    if (this.obs) {
      this.obs.unsubscribe();
    }
  }

  tempchartschecked() {
    this.gettemphistory();
  }

  ontempsnztagchange(i) {
    this.qtemps.keys = this.cetd
      .filter(c => c.checked)
      .map(c => c.keyName)
      .join(',');
  }

  ontempsdatetimeOk(result: Date | Date[] | null) {
    this.qtemps.begin = result[0].toISOString();
    this.qtemps.end = result[1].toISOString();
  }

  gettempslist() {
    this.apitemps = 'api/Devices/' + this.id + '/TelemetryData/' + this.qtemps.keys + '/' + this.qtemps.begin + '/' + this.qtemps.end;
    this.sttemps.req = this.rqtemps;
    this.sttemps.load(1);
  }

  resettemps() {
    this.cetd.forEach(element => {
      element.checked = false;
    });

    this.qtemps.begin = this.initaldatarange[0].toISOString();
    this.qtemps.end = this.initaldatarange[1].toISOString();
  }

  gettempsData() {}

  gettemphistory() {
    var keys = this.tempcharts
      .filter(c => c.checked)
      .map(c => c.label)
      .join(',');
    var date = getTimeDistance(-3);
    this.http
      .post<appmessage<telemetryitem[]>>('api/devices/' + this.id + '/TelemetryData', {
        keys: keys,
        begin: date[0].toISOString(),
        end: date[1].toISOString(),
        every: '0.06:00:00:000',
        aggregate: 'Mean'
      })
      .subscribe(
        next => {
     
          if (this.singlechart) {
            var titleMap = {};
            this.tempcharts
              .filter(c => c.checked)
              .forEach((element, index) => {
                titleMap['y' + (index + 1)] = element.label;
              });

            var chartdata = [];

            from(next.data)
              .pipe(
                groupBy(c => c.dateTime),
                mergeMap(c => c.pipe(reduce((x, y) => [...x, y], [c.key]))),
                map(d => ({ time: d[0], values: d.slice(1) }))
              )
              .subscribe(x => {
                var chartitem = {};
                chartitem['time'] = toDate(x.time.toString());
                x.values.forEach(ele => {
                  for (var key in titleMap) {
                    if (titleMap[key] === ele['keyName']) {
                      chartitem[key] = ele['value'];
                    }
                  }
                });
                chartdata.push(chartitem);
              });
              console.log(titleMap);
            console.log(chartdata);
            console.log(this.tempcharts
              .filter(c => c.checked).length);
this.singlechartAxis=  this.tempcharts
.filter(c => c.checked).length;



            this.singlechartdata=chartdata;
            this.singletitlemap=titleMap;
            this.cdr.detectChanges();
            // this.tempcharts[0].titleMap = titleMap;
            // this.tempcharts[0].chartdata = chartdata;



            // this.tempcharts[0].checked=true;
          } else {
            this.tempcharts
              .filter(c => c.checked)
              .forEach(element => {
                element.titleMap = { y1: element.label, y2: element.label };
                element.chartdata = next.data
                  .filter(d => d.keyName == element.label)
                  .map(d => {
                    return { time: toDate(d.dateTime), y1: d.value };
                  });
              });
          }
        },
        error => {},
        () => {}
      );
  }

  ngOnInit(): void {
    this.apitemps = 'api/Devices/' + this.id + '/TelemetryData/' + this.qtemps.keys + '/' + this.qtemps.begin + '/' + this.qtemps.end;
    this.getdevice();
    this.getattrs(this.id);
    this.gettemps(this.id)
      .pipe(
        mergeMap(x => {
          this.settemps(x);
          x.data.forEach(element => {
            if (typeof element.value === 'number') {
              this.averagetempdata.push(element);
            }
          });
          var keys = this.averagetempdata.map(c => c.keyName).join(',');
          this.tempcharts = this.averagetempdata.map(c => {
            return { label: c.keyName, value: c.keyName, checked: false, chartdata: [], titleMap: { y1: 'y1', y2: 'y1' } } as tempchartitem;
          });
          var date = getTimeDistance(-3);
          var average = this.http.post('api/devices/' + this.id + '/TelemetryData', {
            keys: keys,
            begin: date[0].toISOString(),
            end: date[1].toISOString(),
            every: '3.00:00:00:000',
            aggregate: 'Mean'
          });

          var max = this.http.post('api/devices/' + this.id + '/TelemetryData', {
            keys: keys,
            begin: date[0].toISOString(),
            end: date[1].toISOString(),
            every: '3.00:00:00:000',
            aggregate: 'Max'
          });

          var min = this.http.post('api/devices/' + this.id + '/TelemetryData', {
            keys: keys,
            begin: date[0].toISOString(),
            end: date[1].toISOString(),
            every: '3.00:00:00:000',
            aggregate: 'Min'
          });
          return forkJoin([average, max, min]);
        })
      )
      .subscribe(
        ([average, max, min]) => {
          average.data.forEach(element => {
            var cell = this.cetd.find(c => c.keyName === element['keyName']);
            if (cell) {
              cell.average = element['value'];
            }
          });

          max.data.forEach(element => {
            var cell = this.cetd.find(c => c.keyName === element['keyName']);
            if (cell) {
              cell.max = element['value'];
            }
          });

          min.data.forEach(element => {
            var cell = this.cetd.find(c => c.keyName === element['keyName']);
            if (cell) {
              cell.min = element['value'];
            }
          });
        },
        error => {},
        () => {}
      );
    this.getrules(this.id);
    this.obs = interval(6000).subscribe(async () => {
      this.gettemps(this.id).subscribe(
        next => {
          this.settemps(next);
        },
        error => {},
        () => {}
      );
    });
  }

  getdevice() {
    this.http.get('api/Devices/' + this.id).subscribe(
      next => {
        this.device = next.data;
        this.qal.originatorType = this.device.deviceType == 'Gateway' ? '2' : '1';
        this.qal.OriginatorId = this.id;
        this.stalarm.req = this.alarmerq;
        this.stalarm.load(1);
        this.qevent.Creator = this.id;
        this.stevent.req = this.eventreq;
        this.stevent.load(1);
      },
      error => {},
      () => {}
    );
  }

  getattrs(deviceid) {
    this.http.get<appmessage<attributeitem[]>>('api/Devices/' + deviceid + '/AttributeLatest').subscribe(
      next => {
        if (this.cead.length === 0) {
          this.cead = next.data;
        } else {
          for (var i = 0; i < next.data.length; i++) {
            var flag = false;
            for (var j = 0; j < this.cead.length; j++) {
              if (next.data[i].keyName === this.cead[j].keyName) {
                switch (typeof next.data[i].value) {
                  case 'number':
                    if (this.cead[j]['value']) {
                      if (this.cead[j]['value'] > next.data[i]['value']) {
                        this.cead[j]['class'] = 'valdown';
                      } else if (this.cead[j]['value'] < next.data[i]['value']) {
                        this.cead[j]['class'] = 'valup';
                      } else {
                        this.cead[j]['class'] = 'valnom';
                      }
                    } else {
                      this.cead[j]['class'] = 'valnom';
                    }

                    break;
                  default:
                    if (this.cead[j]['value']) {
                      if (this.cead[j]['value'] === next.data[i]['value']) {
                        this.cead[j]['class'] = 'valnom';
                      } else {
                        this.cead[j]['class'] = 'valchange';
                      }
                    } else {
                      this.cead[j]['class'] = 'valnom';
                    }
                    break;
                }
                this.cead[j].value = next.data[i].value;
                flag = true;
              }
            }
            if (!flag) {
              next.data[i].class = 'valnew';
              this.cead.push(next.data[i]);
            }
          }
        }
      },
      error => {},
      () => {}
    );
  }

  settemps(next) {
    if (this.cetd.length === 0) {
      this.cetd = next.data;
    } else {
      for (var i = 0; i < next.data.length; i++) {
        var flag = false;
        for (var j = 0; j < this.cetd.length; j++) {
          if (next.data[i].keyName === this.cetd[j].keyName) {
            switch (typeof next.data[i].value) {
              case 'number':
                if (this.cetd[j]['value']) {
                  if (this.cetd[j]['value'] > next.data[i]['value']) {
                    this.cetd[j].variation = '-' + (this.cetd[j]['value'] - next.data[i]['value']);
                    this.cetd[j]['class'] = 'valdown';
                  } else if (this.cetd[j]['value'] < next.data[i]['value']) {
                    this.cetd[j].variation = '+' + (next.data[i]['value'] - this.cetd[j]['value']);
                    this.cetd[j]['class'] = 'valup';
                  } else {
                    this.cetd[j]['class'] = 'valnom';
                    this.cetd[j].variation = '';
                  }
                } else {
                  this.cetd[j]['class'] = 'valnom';
                  this.cetd[j].variation = '';
                }

                break;
              default:
                if (this.cetd[j]['value']) {
                  if (this.cetd[j]['value'] === next.data[i]['value']) {
                    this.cetd[j]['class'] = 'valnom';
                    this.cetd[j].variation = '';
                  } else {
                    this.cetd[j]['class'] = 'valchange';
                    this.cetd[j].variation = next.data[i].value;
                  }
                } else {
                  this.cetd[j]['class'] = 'valnom';
                  this.cetd[j].variation = '';
                }
                break;
            }
            this.cetd[j].value = next.data[i].value;
            flag = true;
          }
        }
        if (!flag) {
          next.data[i].class = 'valnew';
          this.cetd.push(next.data[i]);
        }
      }
    }
  }

  gettemps(deviceid) {
    return this.http.get<appmessage<attributeitem[]>>('api/Devices/' + deviceid + '/TelemetryLatest');
  }

  getrules(deviceid) {
    this.http.get<appmessage<ruleitem[]>>('api/Rules/GetDeviceRules?deviceId=' + deviceid).subscribe(
      next => {
        if (next.data.length == 0) {
          this.cerd = [];
        } else {
          for (var i = 0; i < next.data.length; i++) {
            var index = this.cerd.findIndex(c => c.ruleId == next.data[i].ruleId);
            if (index === -1) {
              this.cerd.push(next.data[i]);
            }
          }

          var removed: ruleitem[] = [];

          for (var i = 0; i < this.cerd.length; i++) {
            if (!next.data.some(c => c.ruleId == this.cerd[i].ruleId)) {
              removed = [...removed, this.cerd[i]];
            }
          }

          for (var item of removed) {
            this.cerd.slice(
              this.cerd.findIndex(c => c.ruleId == item.ruleId),
              1
            );
          }
        }
      },
      error => {},
      () => {}
    );
  }

  getevetts() {}

  removeprop(prop: attributeitem) {
    this.http
      .delete('api/devices/removeAttribute?deviceId=' + this.id + '&KeyName=' + prop.keyName + '&dataSide=' + prop.dataSide)
      .subscribe(
        () => {
          this.cead = this.cead.filter(x => x.keyName != prop.keyName);
        },
        () => {},
        () => {}
      );
  }

  removerule(item) {
    this.http.get('api/Rules/DeleteDeviceRules?deviceId=' + this.id + '&ruleId=' + item.ruleId).subscribe(
      () => {
        this.cerd = this.cerd.filter(x => x.ruleId != item.ruleId);
      },
      () => {},
      () => {}
    );
  }
}

class tempchartitem {
  label: string;
  value: string;
  checked: boolean;
  titleMap: any;
  chartdata: any[] = [];
}
