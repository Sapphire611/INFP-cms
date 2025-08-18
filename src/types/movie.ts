import { IMovie } from "@/models/movies";

export interface MovieResponse extends IMovie {
  _id: string;
}
export interface MovieRequest {
  plot?: string;
  genres?: string[];
  runtime?: number;
  cast?: string[];
  poster?: string;
  title?: string;
  fullplot?: string;
  languages?: string[];
  released?: Date;
  directors?: string[];
  rated?: string;
  year?: number;
  countries?: string[];
  imdb?: {
    rating?: number;
    votes?: number;
    id?: number;
  };
  awards?: {
    wins?: number;
    nominations?: number;
    text?: string;
  };
}

export interface MovieUpdateRequest extends MovieRequest {
  _id: string;
}
