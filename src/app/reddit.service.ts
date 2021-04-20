import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class RedditService {

  //https://www.reddit.com/r/classicwowtbc/comments/lsodyx/guild_recruitment_megathread.json
  
  constructor(private http: HttpClient) { }

  private readonly tbcSubRedditPath: string = 'https://www.reddit.com/r/classicwowtbc';

  /** Fetches the reddit comments for a given post. 
   * @param path - the post path, for example  /seodwd/some_topic_blah.json, seen in a full URL as https://reddit.com/r/classicwowtbc/comments/seodwd/some_topic_blah
   */
  public async getCommentsForPost(path: string): Promise<RedditComment[]> {  
    const uri = `${this.tbcSubRedditPath}/comments/${path}`;
    const listings = await this.http.get<RedditListing[]>(uri).toPromise();
    return listings[1].data.children.map(c=>c.data);
  }

}

export class RedditComment {
  total_awards_received: number;
  permalink: string;
  author: string;
  score: number;
  body: string; // appares to be MD
  created_utc: Date;
}

class RedditCommentHost {
  kind: string;
  data: RedditComment;
}

class RedditListing {
  kind: string;
  data: RedditDataThing;
}

class RedditDataThing {
  modhash: string;
  dist: number;
  children: RedditCommentHost[];

  // these are probably dates.
  after: string;
  before: string; 
}
