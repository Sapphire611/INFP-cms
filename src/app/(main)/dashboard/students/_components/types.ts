import { IChild } from "@/models/child";

export interface StudentWithCallback extends IChild {
  onStudentUpdated: () => void;
  onEdit?: () => void;
}
