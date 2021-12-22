export interface CrispResponse {
  error: boolean;
  reason: string;
  data: unknown;
}

export interface NewPeopleProfile {
  email: string;
  person: {
    nickname: string;
  };
}

export interface NewPeopleProfileResponse extends CrispResponse {
  data: {
    people_id: string;
  };
}

export interface SavePeopleData {
  [key: string]: string | number | boolean;
}
