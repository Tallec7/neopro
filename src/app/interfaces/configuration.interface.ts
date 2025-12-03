import { Category } from "./category.interface";
import { Sponsor } from "./sponsor.interface";

export interface Configuration {
    remote: {
        title: string;
    };
    version: string;
    categories: Category[];
    sponsors: Sponsor[];
}