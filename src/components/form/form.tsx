import { FormProvider, UseFormReturn, FieldValues } from "react-hook-form";

type FormProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => void;
  children: React.ReactNode;
};

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {children}
      </form>
    </FormProvider>
  );
}
