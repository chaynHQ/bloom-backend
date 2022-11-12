export interface CrispResponse {
  error: boolean;
  reason: string;
  data: {
    data: unknown;
  };
}
export interface CrispProfileResponse {
  error: boolean;
  reason: string;
  data: {
    segments: string[];
  };
}
export interface NewPeopleProfile {
  email: string;
  person: {
    nickname: string;
  };
  segments: string[];
}

export interface UpdatePeopleProfile {
  email?: string;
  person?: {
    nickname: string;
  };
  segments?: string[];
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
