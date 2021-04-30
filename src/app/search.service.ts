import { Injectable } from '@angular/core';
import { RedditComment, RedditService } from './reddit.service';
import { markdownToTxt } from 'markdown-to-txt';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private reddit: RedditService) { }


  public async loadLatestGuildListings(): Promise<GuildListing[]> {
    const postPath = 'lsodyx/guild_recruitment_megathread.json';
    const comments = await this.reddit.getCommentsForPost(postPath);
    const guilds = comments.map(c => this.formulateGuildFromComment(c));
    return guilds;
  }

  public discoverRaidAvailability(raidTimes: string, raidSchedule: string, debug: boolean = false): Availability {
    const avail = new Availability();

    // Find days listed
    const daySet: Set<Day> = new Set<Day>();
    const dayFinder = /\b((mon|tue|wed(nes)?(s)?|thur(s)?|fri|sat(ur)?|sun)(day)?)\b/gmi;
    const matchesFromSched = raidSchedule.match(dayFinder);
    const matchesFromTimes = raidTimes.match(dayFinder);
    const dayMatches = [...(matchesFromSched !== null ? matchesFromSched : []), ...(matchesFromTimes !== null ? matchesFromTimes : [])];
    dayMatches.filter(m => m).forEach(m => {
      daySet.add(this.toDayEnum(m))
    });

    // Find times listed
    const timeRangeFinder = /[\d]{1,2}.{0,3}-[\d]{1,2}.{0,3}\b|[\d]{1,2}:[\d]{1,2}.{0,2}-[\d]{1,2}:[\d]{1,2}.{0,2}|[\d].{0,4}-( )?[\d]{0,2}.{0,2}|[\d]{1,2}:[\d]{1,2}.{0,2} - [\d]{1,2}:[\d]{1,2}.{0,2}/gmi;
    const rangesFromSched = raidSchedule.match(timeRangeFinder);
    const rangesFromTimes = raidTimes.match(timeRangeFinder);
    const timeMatches = [...(rangesFromSched !== null ? rangesFromSched : []), ...(rangesFromTimes !== null ? rangesFromTimes : [])];
    const times: RaidTime[] = [];
    for (let m of timeMatches) {
      if (!m) continue;
      times.push(this.rangeToRaidTime(m, debug));
    }

    if (debug) {
      console.debug(daySet, dayMatches);
      console.debug(times, timeMatches);
    }

    if (raidSchedule.indexOf('tbd') !== -1) {
      avail.days = [Day.Monday, Day.Tuesday, Day.Wednesday, Day.Thursday, Day.Friday, Day.Saturday, Day.Sunday];
    } else {
      avail.days = Array.from(daySet);
    }

    if (raidTimes.indexOf('tbd') !== -1) {
      avail.times = [{ start: 0, end: 2350, defaulted: true }];
    } else {
      avail.times = times;
    }

    return avail;
  }

  private rangeToRaidTime(range: string, debug: boolean = false): RaidTime {
    try {
      const time = new RaidTime();
      const split = range.split('-');
      const left = split[0];
      const right = split[1];
      time.start = this.timeStringToNumber(left, debug);
      time.end = this.timeStringToNumber(right, debug);

      if (debug) {
        console.debug('time before pm adjust', time);
      }

      if (time.start < 1200) {
        // assume the redditor meant PM... 
        time.start += 1200;
        if (time.end < 1200) {
          time.end += 1200;
        }
      }

      return time;
    }
    catch (e) {
      console.warn(`Unable to parse time range: ${range}, error: ${e}`);
      return null;
    }
  }

  private timeStringToNumber(time: string, debug: boolean = false): number {
    let num = 0;
    num = parseInt(time);

    if (isNaN(num))
      return 0;

    if (num < 24) {
      num *= 100;
    }
    if (debug) console.debug('parseInt', time, num);
    if (time.indexOf('30') !== -1) {
      
      if (num.toString().indexOf('30') === -1) {
        num += 50;
      } else {
        num += 20;
      }
    }
    if (time.indexOf('p') !== -1) { //pm or p
      num += 1200;
    }
    if (time.indexOf('a') !== -1 && num === 1200) {
      num = 0;
    }
    if (debug) console.debug('stringToNumberEnd', num);
    return num;
  }

  private toDayEnum(str: string): Day {

    switch (str.toLowerCase()) {
      case 'sun':
      case 'sunday':
      case 'su':
        return Day.Sunday;
      case 'mon':
      case 'monday':
      case 'mo':
        return Day.Monday;
      case 'tue':
      case 'tues':
      case 'tuesday':
      case 'tu':
        return Day.Tuesday;
      case 'wed':
      case 'weds':
      case 'wednesday':
      case 'we':
        return Day.Wednesday;
      case 'thur':
      case 'thurs':
      case 'thursday':
      case 'th':
        return Day.Thursday;
      case 'fri':
      case 'friday':
      case 'fr':
        return Day.Friday;
      case 'sat':
      case 'saturday':
      case 'sa':
        return Day.Saturday;
    }
  }

  private formulateGuildFromComment(comment: RedditComment): GuildListing {

    const guild: GuildListing = new GuildListing();
    guild.recruiter = comment.author;
    guild.createdUtc = comment.created_utc;
    const plainText = markdownToTxt(comment.body);
    guild.fullPlainText = plainText;
    guild.link = comment.permalink;

    try {
      const nameRegex = /guild name:([^\n]*)\n/gmi;
      guild.name = this.matchOrError(nameRegex, plainText);
      if (guild.name.length > 50 && guild.name.indexOf('realm')) {
        guild.name = guild.name.substr(0, 50) + '...';
        throw new Error('Guild name too long, likely bad formatting.');
      }

      const factionRegex = /faction:([^\n]*)\n/gmi;
      guild.faction = this.matchOrError(factionRegex, plainText).toLowerCase();

      const realmRegex = /realm \(us\/eu\/oc\):([^\n]*)\n|realm:([^\n]*)\n/gmi;
      guild.realm = this.matchOrError(realmRegex, plainText);

      const realmTypeRegex = /realm type:([^\n]*)\n/gmi;
      guild.realmType = this.matchOrError(realmTypeRegex, plainText);

      const realmTzRegex = /realm time zone:([^\n]*)\n/gmi;
      guild.realmTZ = this.matchOrError(realmTzRegex, plainText);

      const progressionRegex = /progression:([^\n]*)\n/gmi;
      guild.progression = this.matchOrError(progressionRegex, plainText);

      const raidTimesRegex = /raid times:([^\n]*)\n/gmi;
      guild.raidTimesStr = this.matchOrError(raidTimesRegex, plainText);

      const raidScheduleRegex = /raid schedule:([^\n]*)\n|raid days:([^\n]*)\n/gmi;
      guild.raidScheduleStr = this.matchOrError(raidScheduleRegex, plainText);

      const debug = false; //guild.name.indexOf('Max Power') !== -1;
      guild.raidAvailability = this.discoverRaidAvailability(guild.raidTimesStr.toLowerCase(), guild.raidScheduleStr.toLowerCase(), debug);
      if (guild.name.indexOf('Shattered Leg') !== -1) {
        console.log('shattered avail', guild);
      }

      const openingsRegex = /openings:([^\n]*)\n/gmi;
      guild.openings = this.matchOrError(openingsRegex, plainText);

      const addInfoRegex = /Additional Information:([^\n]*)/gmi;
      guild.additionalInfo = this.matchOrError(addInfoRegex, plainText);
    }
    catch (e) {
      guild.error = e;
      console.warn('fatal error parsing guild listing', [e, guild]);
    }
    return guild;
  }

  private formulatePlayerFromComment(comment: RedditComment): Player {
    throw new Error("Not implemented");
  }

  private matchOrError(rX: RegExp, str: string): string {
    const matches = rX.exec(str);
    if (matches) {

      for (let k = 1; k < matches.length; k++) {
        if (matches[k]) {
          return matches[k].trim();
        }
      }
    }

    return '???';
  }
}

export class GuildListing {
  name: string = '-ERROR-';
  faction: string = '?';
  realm: string;
  realmType: string = '?';
  realmTZ: string;
  progression: string;

  raidTimesStr: string;
  raidScheduleStr: string;
  raidAvailability: Availability;

  openings: string;
  additionalInfo: string;
  recruiter: string;
  createdUtc: Date;

  fullPlainText: string;
  error: string;
  link: string;
}

export class Availability {
  group: number; // the raid group. (Group 1, Group 2)
  days: Day[]
  times: RaidTime[];
}

export enum Day { Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday }

export class RaidTime {
  start: number;
  end: number;
  defaulted: boolean;
}

export class Player {


}
