import { IClass } from "@/models/class";

export interface ClassWithCallback extends IClass {
  onClassUpdated: () => void;
  onEdit?: () => void;
}
