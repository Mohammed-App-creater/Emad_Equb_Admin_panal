import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FormError({ name, label }: { name: string; label: string }) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea {...register(name)} />
      {errors[name] && (
        <p className="text-sm text-danger">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}
