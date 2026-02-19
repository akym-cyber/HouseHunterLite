import 'react-native-gesture-handler';

declare module 'react-native-gesture-handler' {
  import { ComponentClass } from 'react';
  import { TouchableOpacityProps, ViewProps } from 'react-native';

  export const TouchableOpacity: ComponentClass<TouchableOpacityProps>;
  export const ScrollView: ComponentClass<ViewProps>;
  export const FlatList: ComponentClass<any>;
  export const PanGestureHandler: ComponentClass<any>;
  export const TapGestureHandler: ComponentClass<any>;
  export const GestureDetector: ComponentClass<any>;
  export const Gesture: any;
  export const State: any;
}
