
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "app_config": {
                  Row: {
                    "description": string,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"locations": {
                  Row: {
                    "address": string,"created_at": string,"hours": NonNullable<Json>,"id": string,"latitude": number,"longitude": number,"name": string,"ordering_enabled": boolean,"phone_e164": string | null,"pickup_lead_time_minutes": number,"pos_location_id": string | null,"pos_type": Database["public"]['Enums']["pos_type"] | null,"timezone": string,"uber_eats_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"created_at"?: string,"hours"?: NonNullable<Json>,"id"?: string,"latitude": number,"longitude": number,"name": string,"ordering_enabled"?: boolean,"phone_e164"?: string | null,"pickup_lead_time_minutes"?: number,"pos_location_id"?: string | null,"pos_type"?: Database["public"]['Enums']["pos_type"] | null,"timezone"?: string,"uber_eats_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"hours"?: NonNullable<Json>,"id"?: string,"latitude"?: number,"longitude"?: number,"name"?: string,"ordering_enabled"?: boolean,"phone_e164"?: string | null,"pickup_lead_time_minutes"?: number,"pos_location_id"?: string | null,"pos_type"?: Database["public"]['Enums']["pos_type"] | null,"timezone"?: string,"uber_eats_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"loyalty_settings": {
                  Row: {
                    "created_at": string,"daily_points_cap": number | null,"daily_receipt_claims_cap": number | null,"earn_base": Database["public"]['Enums']["loyalty_earn_base"],"effective_from": string,"expiry_policy": Database["public"]['Enums']["loyalty_expiry_policy"],"expiry_warning_days": (number)[],"id": string,"inactivity_months": number | null,"is_placeholder": boolean,"label": string,"max_points_per_transaction": number | null,"min_spend_cents": number,"multipliers": NonNullable<Json>,"points_per_dollar": number,"purchase_age_limit_days": number,"redemption_code_ttl_minutes": number,"rounding_mode": Database["public"]['Enums']["loyalty_rounding_mode"],"signup_bonus_points": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"daily_points_cap"?: number | null,"daily_receipt_claims_cap"?: number | null,"earn_base"?: Database["public"]['Enums']["loyalty_earn_base"],"effective_from": string,"expiry_policy"?: Database["public"]['Enums']["loyalty_expiry_policy"],"expiry_warning_days"?: (number)[],"id"?: string,"inactivity_months"?: number | null,"is_placeholder"?: boolean,"label": string,"max_points_per_transaction"?: number | null,"min_spend_cents"?: number,"multipliers"?: NonNullable<Json>,"points_per_dollar": number,"purchase_age_limit_days": number,"redemption_code_ttl_minutes": number,"rounding_mode"?: Database["public"]['Enums']["loyalty_rounding_mode"],"signup_bonus_points"?: number
                  }
                  Update: {
                    "created_at"?: string,"daily_points_cap"?: number | null,"daily_receipt_claims_cap"?: number | null,"earn_base"?: Database["public"]['Enums']["loyalty_earn_base"],"effective_from"?: string,"expiry_policy"?: Database["public"]['Enums']["loyalty_expiry_policy"],"expiry_warning_days"?: (number)[],"id"?: string,"inactivity_months"?: number | null,"is_placeholder"?: boolean,"label"?: string,"max_points_per_transaction"?: number | null,"min_spend_cents"?: number,"multipliers"?: NonNullable<Json>,"points_per_dollar"?: number,"purchase_age_limit_days"?: number,"redemption_code_ttl_minutes"?: number,"rounding_mode"?: Database["public"]['Enums']["loyalty_rounding_mode"],"signup_bonus_points"?: number
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "created_at": string,"id": string,"order_id": string,"product_id": string,"quantity": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"order_id": string,"product_id": string,"quantity": number,"unit_price": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"order_id"?: string,"product_id"?: string,"quantity"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "created_at": string,"id": string,"notes": string | null,"points_earned": number,"status": Database["public"]['Enums']["order_status"],"total_amount": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notes"?: string | null,"points_earned"?: number,"status"?: Database["public"]['Enums']["order_status"],"total_amount": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notes"?: string | null,"points_earned"?: number,"status"?: Database["public"]['Enums']["order_status"],"total_amount"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"point_balances": {
                  Row: {
                    "balance": number,"last_activity_at": string | null,"lifetime_earned": number,"lifetime_redeemed": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "balance"?: number,"last_activity_at"?: string | null,"lifetime_earned"?: number,"lifetime_redeemed"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "balance"?: number,"last_activity_at"?: string | null,"lifetime_earned"?: number,"lifetime_redeemed"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "point_balances_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"points_ledger": {
                  Row: {
                    "created_at": string,"created_by": string | null,"delta": number,"id": string,"idempotency_key": string,"location_id": string | null,"metadata": NonNullable<Json>,"reason": string | null,"reversal_of": string | null,"settings_version_id": string | null,"source_id": string | null,"source_type": Database["public"]['Enums']["points_source_type"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"delta": number,"id"?: string,"idempotency_key": string,"location_id"?: string | null,"metadata"?: NonNullable<Json>,"reason"?: string | null,"reversal_of"?: string | null,"settings_version_id"?: string | null,"source_id"?: string | null,"source_type": Database["public"]['Enums']["points_source_type"],"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"delta"?: number,"id"?: string,"idempotency_key"?: string,"location_id"?: string | null,"metadata"?: NonNullable<Json>,"reason"?: string | null,"reversal_of"?: string | null,"settings_version_id"?: string | null,"source_id"?: string | null,"source_type"?: Database["public"]['Enums']["points_source_type"],"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "points_ledger_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_reversal_of_fkey"
      columns: ["reversal_of"]
isOneToOne: true
      referencedRelation: "points_ledger"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_settings_version_id_fkey"
      columns: ["settings_version_id"]
isOneToOne: false
      referencedRelation: "loyalty_settings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "category": string,"created_at": string,"description": string | null,"id": string,"image_url": string | null,"is_available": boolean,"name": string,"price": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"description"?: string | null,"id"?: string,"image_url"?: string | null,"is_available"?: boolean,"name": string,"price": number,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"image_url"?: string | null,"is_available"?: boolean,"name"?: string,"price"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "birthday_day": number | null,"birthday_locked_at": string | null,"birthday_month": number | null,"created_at": string,"email": string,"first_name": string | null,"id": string,"last_name": string | null,"locale": string,"phone_e164": string | null,"province": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "birthday_day"?: number | null,"birthday_locked_at"?: string | null,"birthday_month"?: number | null,"created_at"?: string,"email": string,"first_name"?: string | null,"id": string,"last_name"?: string | null,"locale"?: string,"phone_e164"?: string | null,"province"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "birthday_day"?: number | null,"birthday_locked_at"?: string | null,"birthday_month"?: number | null,"created_at"?: string,"email"?: string,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"locale"?: string,"phone_e164"?: string | null,"province"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reward_redemptions": {
                  Row: {
                    "channel": Database["public"]['Enums']["redemption_channel"],"code": string,"created_at": string,"expires_at": string,"fulfilled_at": string | null,"fulfilled_by": string | null,"id": string,"idempotency_key": string,"ledger_entry_id": string,"order_id": string | null,"points_spent": number,"reward_id": string,"status": Database["public"]['Enums']["redemption_status"],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": Database["public"]['Enums']["redemption_channel"],"code": string,"created_at"?: string,"expires_at": string,"fulfilled_at"?: string | null,"fulfilled_by"?: string | null,"id"?: string,"idempotency_key": string,"ledger_entry_id": string,"order_id"?: string | null,"points_spent": number,"reward_id": string,"status"?: Database["public"]['Enums']["redemption_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["redemption_channel"],"code"?: string,"created_at"?: string,"expires_at"?: string,"fulfilled_at"?: string | null,"fulfilled_by"?: string | null,"id"?: string,"idempotency_key"?: string,"ledger_entry_id"?: string,"order_id"?: string | null,"points_spent"?: number,"reward_id"?: string,"status"?: Database["public"]['Enums']["redemption_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reward_redemptions_fulfilled_by_fkey"
      columns: ["fulfilled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reward_redemptions_ledger_entry_id_fkey"
      columns: ["ledger_entry_id"]
isOneToOne: false
      referencedRelation: "points_ledger"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reward_redemptions_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reward_redemptions_reward_id_fkey"
      columns: ["reward_id"]
isOneToOne: false
      referencedRelation: "rewards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reward_redemptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rewards": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"description": string | null,"ends_at": string | null,"id": string,"image_path": string | null,"is_active": boolean,"menu_item_id": string | null,"name": string,"per_user_limit": number | null,"point_cost": number,"sort_order": number,"starts_at": string | null,"stock": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"menu_item_id"?: string | null,"name": string,"per_user_limit"?: number | null,"point_cost": number,"sort_order"?: number,"starts_at"?: string | null,"stock"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"image_path"?: string | null,"is_active"?: boolean,"menu_item_id"?: string | null,"name"?: string,"per_user_limit"?: number | null,"point_cost"?: number,"sort_order"?: number,"starts_at"?: string | null,"stock"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rewards_menu_item_id_fkey"
      columns: ["menu_item_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_loyalty_settings":
{ Args: { "p_at"?: string }; Returns: {
              "created_at": string,
"daily_points_cap": number | null,
"daily_receipt_claims_cap": number | null,
"earn_base": Database["public"]['Enums']["loyalty_earn_base"],
"effective_from": string,
"expiry_policy": Database["public"]['Enums']["loyalty_expiry_policy"],
"expiry_warning_days": (number)[],
"id": string,
"inactivity_months": number | null,
"is_placeholder": boolean,
"label": string,
"max_points_per_transaction": number | null,
"min_spend_cents": number,
"multipliers": NonNullable<Json>,
"points_per_dollar": number,
"purchase_age_limit_days": number,
"redemption_code_ttl_minutes": number,
"rounding_mode": Database["public"]['Enums']["loyalty_rounding_mode"],
"signup_bonus_points": number
            }
                          SetofOptions: {
        from: "*"
        to: "loyalty_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"set_user_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"],"p_user_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "customer"|"staff"|"admin"|"owner","loyalty_earn_base": "pre_tax_subtotal"|"post_tax_total","loyalty_expiry_policy": "none"|"inactivity","loyalty_rounding_mode": "down"|"nearest"|"up","order_status": "pending"|"confirmed"|"preparing"|"ready"|"completed"|"cancelled","points_source_type": "pos_purchase"|"qr_counter"|"receipt"|"admin_adjust"|"reward_redeem"|"redemption_refund"|"offer_bonus"|"expiry"|"reversal"|"signup_bonus","pos_type": "square"|"toast","redemption_channel": "counter"|"pickup","redemption_status": "issued"|"fulfilled"|"cancelled"|"expired"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["customer", "staff", "admin", "owner"],"loyalty_earn_base": ["pre_tax_subtotal", "post_tax_total"],"loyalty_expiry_policy": ["none", "inactivity"],"loyalty_rounding_mode": ["down", "nearest", "up"],"order_status": ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],"points_source_type": ["pos_purchase", "qr_counter", "receipt", "admin_adjust", "reward_redeem", "redemption_refund", "offer_bonus", "expiry", "reversal", "signup_bonus"],"pos_type": ["square", "toast"],"redemption_channel": ["counter", "pickup"],"redemption_status": ["issued", "fulfilled", "cancelled", "expired"]
          }
        }
} as const
