
'use client';
import { locateStationAmenity } from "@/ai/flows/station-amenity-locator";
import type { LocateStationAmenityOutput } from "@/ai/flows/station-amenity-locator";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Sparkles } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

const formSchema = z.object({
  amenity: z.string().min(2, {
    message: "Amenity must be at least 2 characters.",
  }),
  stationMap: z.any().refine(
    (files) => files?.length === 1, "Station map image is required."
  ).refine(
    (files) => files?.[0]?.size <= 5000000, "Max file size is 5MB."
  ).refine(
    (files) => ["image/jpeg", "image/png", "image/webp"].includes(files?.[0]?.type),
    "Only .jpg, .png, and .webp formats are supported."
  ),
});

export function AmenityFinder() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<LocateStationAmenityOutput | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amenity: "",
      stationMap: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setResult(null);

    const file = values.stationMap[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const stationMapDataUri = reader.result as string;
      try {
        const output = await locateStationAmenity({ 
          amenity: values.amenity,
          stationMapDataUri 
        });
        setResult(output);
      } catch (error) {
        console.error("Error locating amenity:", error);
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: "Could not locate the amenity. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "Could not read the uploaded image file.",
      });
      setLoading(false);
    };
  }
  
  const fileRef = form.register("stationMap");

  return (
    <div className="p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="amenity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amenity</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Restroom, ATM, Ticket Counter" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="stationMap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Station Map Photo</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp"
                    {...fileRef}
                    onChange={(event) => {
                      field.onChange(event.target?.files?.[0] ?? undefined);
                      if (event.target.files && event.target.files[0]) {
                        setImagePreview(URL.createObjectURL(event.target.files[0]));
                      } else {
                        setImagePreview(null);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {imagePreview && (
            <div className="mt-4 rounded-md overflow-hidden border">
                <Image src={imagePreview} alt="Station map preview" width={400} height={300} className="object-cover" />
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Find Amenity
              </>
            )}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5"/>
                Location Found
            </h3>
            <p className="text-foreground">{result.description}</p>
        </div>
      )}
    </div>
  );
}
