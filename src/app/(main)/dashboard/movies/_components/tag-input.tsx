import * as React from "react";

import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TagInputProps {
  label: string;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
}

export function TagInput({ label, tags, setTags, inputValue, setInputValue, placeholder }: TagInputProps) {
  // 处理标签添加
  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && (e.type === "keydown" || e.type === "click")) {
      e.preventDefault();
    }

    if (inputValue.trim() && !tags.includes(inputValue.trim())) {
      setTags([...tags, inputValue.trim()]);
      setInputValue("");
    }
  };

  // 处理标签删除
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
          </Badge>
        ))}
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddTag(e);
              }
            }}
          />
          <Button size="icon" variant="secondary" onClick={handleAddTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
