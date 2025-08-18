import { MovieResponse } from "@/types/movie";

// 定义带回调函数的电影类型
export interface MovieWithCallback extends MovieResponse {
  onMovieUpdated: () => void;
}
