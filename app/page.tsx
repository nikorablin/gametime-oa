import { EventListing } from "@/app/components/event-listing";
import { checkoutService } from "@/lib/checkout/service";

export default function Home() {
  return <EventListing listing={checkoutService.getListing()} />;
}
