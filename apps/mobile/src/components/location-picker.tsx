import { Crosshair, MapPin, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentLocation, reverseGeocode, type GeoAddress } from '../lib/geo';
import { haptics } from '../lib/haptics';
import { Button } from '../ui/button';

import { LeafletMap, TASHKENT, type LatLng } from './leaflet-map';

export interface PickedLocation extends LatLng, GeoAddress {}

interface Props {
  initial?: LatLng;
  onConfirm: (loc: PickedLocation) => void;
  onClose: () => void;
}

export function LocationPicker({ initial, onConfirm, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [center, setCenter] = React.useState<LatLng>(initial ?? TASHKENT);
  const [selected, setSelected] = React.useState<LatLng>(initial ?? TASHKENT);
  const [address, setAddress] = React.useState<GeoAddress>({});
  const [locating, setLocating] = React.useState(false);

  // Tanlangan nuqta o'zgarsa — manzilni aniqlaymiz (preview uchun)
  React.useEffect(() => {
    let active = true;
    void reverseGeocode(selected.lat, selected.lng).then((a) => {
      if (active) setAddress(a);
    });
    return () => {
      active = false;
    };
  }, [selected.lat, selected.lng]);

  const useMyLocation = async () => {
    setLocating(true);
    haptics.light();
    const loc = await getCurrentLocation();
    setLocating(false);
    if (!loc) return;
    haptics.success();
    setCenter(loc); // xaritani siljitadi
    setSelected(loc);
  };

  const addressLine =
    [address.region, address.city, address.street].filter(Boolean).join(', ') ||
    'Pinni manzilingizga suring';

  return (
    <View className="bg-background absolute inset-0" style={{ elevation: 20, zIndex: 20 }}>
      {/* Header */}
      <View
        className="border-border flex-row items-center border-b px-3 pb-2"
        style={{ paddingTop: insets.top + 6 }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={8}
          className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <X size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold">Manzilni tanlash</Text>
        <View className="w-10" />
      </View>

      {/* Map */}
      <View className="flex-1">
        <LeafletMap center={center} pin={selected} onPick={setSelected} zoom={15} />

        {/* Mening joylashuvim */}
        <Pressable
          onPress={useMyLocation}
          disabled={locating}
          className="border-border bg-background absolute right-4 top-4 h-11 w-11 items-center justify-center rounded-full border shadow"
        >
          {locating ? (
            <ActivityIndicator size="small" color="#8B0020" />
          ) : (
            <Crosshair size={20} color="#8B0020" />
          )}
        </Pressable>
      </View>

      {/* Bottom — tanlangan manzil + tasdiqlash */}
      <View
        className="border-border bg-background gap-3 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-start gap-2">
          <MapPin size={18} color="#8B0020" style={{ marginTop: 1 }} />
          <Text className="text-foreground flex-1 text-sm">{addressLine}</Text>
        </View>
        <Button
          fullWidth
          size="lg"
          onPress={() => {
            haptics.success();
            onConfirm({ ...selected, ...address });
          }}
        >
          Manzilni tasdiqlash
        </Button>
      </View>
    </View>
  );
}
