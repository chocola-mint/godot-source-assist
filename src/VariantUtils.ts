export function convertEnumNameToBindName(enumName : string) {
    switch (enumName) {
        case "BOOL": return "bool";
        case "INT": return "int";
        case "FLOAT": return "float";
        case "STRING": return "String";
        case "VECTOR2": return "Vector2";
        case "VECTOR2I": return "Vector2i";
        case "RECT2": return "Rect2";
        case "RECT2I": return "Rect2i";
        case "VECTOR3": return "Vector3";
        case "VECTOR3I": return "Vector3i";
        case "TRANSFORM2D": return "Transform2D";
        case "VECTOR4": return "Vector4";
        case "VECTOR4I": return "Vector4i";
        case "PLANE": return "Plane";
        case "QUATERNION": return "Quaternion";
        case "AABB": return "AABB";
        case "BASIS": return "Basis";
        case "TRANSFORM3D": return "Transform3D";
        case "PROJECTION": return "Projection";
        case "COLOR": return "Color";
        case "STRING_NAME": return "StringName";
        case "NODE_PATH": return "NodePath";
        case "RID": return "RID";
        case "OBJECT": return "Object";
        case "CALLABLE": return "Callable";
        case "SIGNAL": return "Signal";
        case "DICTIONARY": return "Dictionary";
        case "ARRAY": return "Array";
        case "PACKED_BYTE_ARRAY": return "PackedByteArray";
        case "PACKED_INT32_ARRAY": return "PackedInt32Array";
        case "PACKED_INT64_ARRAY": return "PackedInt64Array";
        case "PACKED_FLOAT32_ARRAY": return "PackedFloat32Array";
        case "PACKED_FLOAT64_ARRAY": return "PackedFloat64Array";
        case "PACKED_STRING_ARRAY": return "PackedStringArray";
        case "PACKED_VECTOR2_ARRAY": return "PackedVector2Array";
        case "PACKED_VECTOR3_ARRAY": return "PackedVector3Array";
        case "PACKED_COLOR_ARRAY": return "PackedColorArray";
        case "PACKED_VECTOR4_ARRAY": return "PackedVector4Array";

        default: return enumName;
    }
}