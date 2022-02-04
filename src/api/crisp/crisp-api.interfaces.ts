export interface CrispResponse {
  error: boolean;
  reason: string;
  data: {
    data: unknown;
  };
}

export interface NewPeopleProfile {
  email: string;
  person: {
    nickname: string;
  };
}

export interface NewPeopleProfileResponse extends CrispResponse {
  data: {
    data: {
      people_id: string;
    };
  };
}

export interface PeopleData {
  [key: string]: string | number | boolean;
}
