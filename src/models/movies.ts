import mongoose, { Document, Schema } from "mongoose";

export interface IMovie extends Document {
  plot: string;
  genres: string[];
  runtime: number;
  cast: string[];
  poster: string;
  title: string;
  fullplot: string;
  languages: string[];
  released: Date;
  directors: string[];
  rated: string;
  awards: {
    wins: number;
    nominations: number;
    text: string;
  };
  lastupdated: string;
  year: number;
  imdb: {
    rating: number;
    votes: number;
    id: number;
  };
  countries: string[];
  type: string;
  tomatoes: {
    viewer: {
      rating: number;
      numReviews: number;
      meter: number;
    };
    fresh: number;
    critic: {
      rating: number;
      numReviews: number;
      meter: number;
    };
    rotten: number;
    lastUpdated: Date;
  };
  num_mflix_comments: number;
}

const MovieSchema: Schema = new Schema(
  {
    plot: {
      type: String,
      required: [true, "Please provide a plot"],
    },
    genres: {
      type: [String],
      required: [true, "Please provide genres"],
    },
    runtime: {
      type: Number,
      required: [true, "Please provide runtime"],
    },
    cast: {
      type: [String],
      required: [true, "Please provide cast members"],
    },
    poster: {
      type: String,
      required: [true, "Please provide poster URL"],
    },
    title: {
      type: String,
      required: [true, "Please provide title"],
      trim: true,
    },
    fullplot: {
      type: String,
      required: [true, "Please provide full plot"],
    },
    languages: {
      type: [String],
      required: [true, "Please provide languages"],
    },
    released: {
      type: Date,
      required: [true, "Please provide release date"],
    },
    directors: {
      type: [String],
      required: [true, "Please provide directors"],
    },
    rated: {
      type: String,
      required: [true, "Please provide rating"],
    },
    awards: {
      wins: {
        type: Number,
        required: [true, "Please provide award wins"],
      },
      nominations: {
        type: Number,
        required: [true, "Please provide award nominations"],
      },
      text: {
        type: String,
        required: [true, "Please provide award text"],
      },
    },
    lastupdated: {
      type: String,
      required: [true, "Please provide last updated timestamp"],
    },
    year: {
      type: Number,
      required: [true, "Please provide year"],
    },
    imdb: {
      rating: {
        type: Number,
        required: [true, "Please provide IMDb rating"],
      },
      votes: {
        type: Number,
        required: [true, "Please provide IMDb votes"],
      },
      id: {
        type: Number,
        required: [true, "Please provide IMDb ID"],
      },
    },
    countries: {
      type: [String],
      required: [true, "Please provide countries"],
    },
    type: {
      type: String,
      required: [true, "Please provide type"],
    },
    tomatoes: {
      viewer: {
        rating: {
          type: Number,
          required: [true, "Please provide viewer rating"],
        },
        numReviews: {
          type: Number,
          required: [true, "Please provide number of viewer reviews"],
        },
        meter: {
          type: Number,
          required: [true, "Please provide viewer meter"],
        },
      },
      fresh: {
        type: Number,
        required: [true, "Please provide fresh rating"],
      },
      critic: {
        rating: {
          type: Number,
          required: [true, "Please provide critic rating"],
        },
        numReviews: {
          type: Number,
          required: [true, "Please provide number of critic reviews"],
        },
        meter: {
          type: Number,
          required: [true, "Please provide critic meter"],
        },
      },
      rotten: {
        type: Number,
        required: [true, "Please provide rotten rating"],
      },
      lastUpdated: {
        type: Date,
        required: [true, "Please provide last updated date for tomatoes"],
      },
    },
    num_mflix_comments: {
      type: Number,
      required: [true, "Please provide number of comments"],
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 30000,
  },
);

// 添加常用查询字段的索引以提高性能
MovieSchema.index({ title: 1 });
MovieSchema.index({ year: 1 });
MovieSchema.index({ genres: 1 });
MovieSchema.index({ "imdb.rating": 1 });
MovieSchema.index({ createdAt: -1 });

// 复合索引，优化常见的查询组合
MovieSchema.index({ title: 1, year: 1 });
MovieSchema.index({ genres: 1, "imdb.rating": -1 });

export default mongoose.models.Movies ?? mongoose.model<IMovie>("Movies", MovieSchema);
