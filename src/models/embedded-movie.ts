import mongoose, { Document, Schema } from "mongoose";

export interface IEmbeddedMovie extends Document {
  plot: string;
  genres: string[];
  runtime: number;
  rated: string;
  cast: string[];
  num_mflix_comments: number;
  poster: string;
  title: string;
  fullplot: string;
  languages: string[];
  released: Date;
  directors: string[];
  writers: string[];
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
    dvd: Date;
    critic: {
      rating: number;
      numReviews: number;
      meter: number;
    };
    lastUpdated: Date;
    rotten: number;
    production: string;
    fresh: number;
  };
  plot_embedding: Buffer;
}

const embeddedMovieSchema: Schema = new Schema(
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
    rated: {
      type: String,
      required: [true, "Please provide rating"],
    },
    cast: {
      type: [String],
      required: [true, "Please provide cast members"],
    },
    num_mflix_comments: {
      type: Number,
      required: [true, "Please provide number of comments"],
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
    writers: {
      type: [String],
      required: [true, "Please provide writers"],
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
      dvd: {
        type: Date,
        required: [true, "Please provide DVD release date"],
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
      lastUpdated: {
        type: Date,
        required: [true, "Please provide last updated date for tomatoes"],
      },
      rotten: {
        type: Number,
        required: [true, "Please provide rotten rating"],
      },
      production: {
        type: String,
        required: [true, "Please provide production company"],
      },
      fresh: {
        type: Number,
        required: [true, "Please provide fresh rating"],
      },
    },
    plot_embedding: {
      type: Buffer,
      required: [true, "Please provide plot embedding"],
    },
  },
  {
    timestamps: true,
    bufferTimeoutMS: 30000,
  },
);

export default mongoose.models.EmbeddedMovie ?? mongoose.model<IEmbeddedMovie>("embedded_movies", embeddedMovieSchema);
