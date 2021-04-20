import { Component, OnInit } from '@angular/core';
import { Day, GuildListing, SearchService } from './search.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public title = 'tbc gfinder';
  public state: any = {
    loading: true
  };


  public guilds: GuildListing[] = [];
  public filteredGuilds: GuildListing[] = [];

  public startTime: number = 0;
  public endTime: number = 2350;
  public raidDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  public realmFilter: string = null;
  public typeFilter: string = 'any';
  public searchText: string = null;

  public factions: any[] = [{ name: 'Either Faction', value: 'any' }, { name: 'Horde', value: 'horde' }, { name: 'Alliance', value: 'alliance' }];
  public factionFilterVal: string = 'any';

  public availableRealms: string[] = [];

  public Day = Day;

  constructor(private searchSvc: SearchService) { }
  async ngOnInit(): Promise<void> {

    this.guilds = await this.searchSvc.loadLatestGuildListings();
    this.runFilter();
    this.availableRealms = this.filteredGuilds.map(g => g.realm).filter(r => r && r !== '' && r.length > 3);
    this.state.loading = false;
  }

  public runFilter(): void {
    console.debug('runFilter()');
    this.filteredGuilds = [...this.guilds.filter(g => g.name !== '???')];

    if (this.realmFilter !== null) {
      this.filteredGuilds = this.filteredGuilds.filter(g => {
        return g.realm && g.realm.toLowerCase().indexOf(this.realmFilter.toLowerCase().trim()) !== -1;
      });
    }

    if (this.factionFilterVal !== 'any') {
      this.filteredGuilds = this.filteredGuilds.filter(g => {
        return g.faction === this.factionFilterVal  //g.faction is already lowcapped
      });
    }

    if (this.typeFilter !== 'any') {
      this.filteredGuilds = this.filteredGuilds.filter(g => {
        return g.realmType.toLowerCase() === this.typeFilter.toLowerCase();
      });
    }

    if (this.searchText !== null) {
      this.filteredGuilds = this.filteredGuilds.filter(g => {
        return g.fullPlainText.toLowerCase().indexOf(this.searchText.trim().toLowerCase()) !== -1;
      })
    }


    this.filteredGuilds = this.filteredGuilds.filter(g => {
      if (!g.raidAvailability)
        return true;

      let inStartRange: boolean = false;
      let inEndRange: boolean = false;
      let inTimeRange: boolean = false;

      for (let t of g.raidAvailability.times) {
        if (t.start >= this.startTime) {
          inStartRange = true;
        }
        if (t.end <= this.endTime) {
          inEndRange = true;
        }
      }

      inTimeRange = inStartRange && inEndRange;
      if (g.raidAvailability.times.length === 0) inTimeRange = true;

      let inDayRange = false;
      this.raidDays.forEach(d => {
        if (g.raidAvailability.days.indexOf(Day[d]) !== -1) {
          inDayRange = true;
        }
      })

      if (g.raidAvailability.days.length === 0) inDayRange = true;

      // if (!inTimeRange || !inDayRange) {
      //   // these were filtered out due to time/day ranges
      //   console.debug(g.name, `timeR: ${inTimeRange}, dayR: ${inDayRange}`, g);
      // }
      return inTimeRange && inDayRange;
    });
  }

  public toggleRaidDay(day: string): void {
    const dayIx = this.raidDays.indexOf(day);
    if (dayIx === -1) {
      this.raidDays.push(day);
    } else {
      this.raidDays.splice(dayIx, 1);
    }
    this.runFilter();
  }

  public hasSelectedDay(day: string): boolean {
    return this.raidDays.indexOf(day) !== -1;
  }

  public parseTime(time: number): string {

    const halfHour = time.toString().endsWith('50');
    let isPm = false;
    if (halfHour) {
      time -= 50;
    }

    let hour = time / 100;
    isPm = hour > 11;
    if (hour >= 13) {
      hour -= 12;
    }

    return `${hour}:${halfHour ? '30' : '00'}${isPm ? 'pm' : 'am'}`;
  }

}
