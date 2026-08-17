export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cittadino_editions: {
        Row: {
          created_at: string
          id: number
          name: string
          updated_at: string
          uuid: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          updated_at?: string
          uuid?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          updated_at?: string
          uuid?: string
          year?: number
        }
        Relationships: []
      }
      commander_decks: {
        Row: {
          commander_1_name: string
          commander_2_name: string | null
          companion_name: string | null
          created_at: string
          decklist_url: string | null
          id: number
          player_uuid: string
          updated_at: string
          uuid: string
        }
        Insert: {
          commander_1_name: string
          commander_2_name?: string | null
          companion_name?: string | null
          created_at?: string
          decklist_url?: string | null
          id?: number
          player_uuid: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          commander_1_name?: string
          commander_2_name?: string | null
          companion_name?: string | null
          created_at?: string
          decklist_url?: string | null
          id?: number
          player_uuid?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_commander_decks_player"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_commander_decks_player"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_uuid: string
          id: number
          joined_at: string
          player_uuid: string
          role: string
          status: string
          updated_at: string
          uuid: string
        }
        Insert: {
          event_uuid: string
          id?: number
          joined_at?: string
          player_uuid: string
          role?: string
          status?: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          event_uuid?: string
          id?: number
          joined_at?: string
          player_uuid?: string
          role?: string
          status?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_event_attendees_event_uuid_fkey"
            columns: ["event_uuid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_event_attendees_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_event_attendees_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
        ]
      }
      events: {
        Row: {
          companion_app_code: string | null
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: number
          image_url: string | null
          location_uuid: string | null
          name: string
          organizer_uuid: string
          starts_at: string | null
          status: string
          updated_at: string
          uuid: string
        }
        Insert: {
          companion_app_code?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: number
          image_url?: string | null
          location_uuid?: string | null
          name: string
          organizer_uuid: string
          starts_at?: string | null
          status: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          companion_app_code?: string | null
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: number
          image_url?: string | null
          location_uuid?: string | null
          name?: string
          organizer_uuid?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_events_location_uuid_fkey"
            columns: ["location_uuid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_events_organizer_uuid_fkey"
            columns: ["organizer_uuid"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["uuid"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: number
          image_url: string | null
          name: string
          ruleset_uuid: string | null
          starts_at: string | null
          status: string
          updated_at: string
          uuid: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: number
          image_url?: string | null
          name: string
          ruleset_uuid?: string | null
          starts_at?: string | null
          status: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: number
          image_url?: string | null
          name?: string
          ruleset_uuid?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leagues_ruleset_uuid_fkey"
            columns: ["ruleset_uuid"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["uuid"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string
          email: string | null
          facebook_url: string | null
          google_maps_url: string | null
          id: number
          image_url: string | null
          instagram_url: string | null
          name: string
          opening_hours: Json | null
          phone: string | null
          postal_code: string
          province: string
          telegram_url: string | null
          temporarily_closed: boolean
          updated_at: string
          uuid: string
          website: string | null
          whatsapp_url: string | null
        }
        Insert: {
          address: string
          city: string
          country?: string
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          id?: number
          image_url?: string | null
          instagram_url?: string | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          postal_code: string
          province: string
          telegram_url?: string | null
          temporarily_closed?: boolean
          updated_at?: string
          uuid?: string
          website?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          id?: number
          image_url?: string | null
          instagram_url?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          postal_code?: string
          province?: string
          telegram_url?: string | null
          temporarily_closed?: boolean
          updated_at?: string
          uuid?: string
          website?: string | null
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      mtg_commanders: {
        Row: {
          card_name: string
          cmc: number | null
          color_identity: string[] | null
          edhrec_rank: number | null
          id: number
          image_url: string | null
          keywords: string[] | null
          last_synced_at: string
          legalities: Json | null
          mana_cost: string | null
          oracle_text: string | null
          partner_group_tag: string | null
          partner_type: string | null
          partner_with_scryfall_id: string | null
          released_at: string | null
          scryfall_id: string
          scryfall_url: string
          type_line: string | null
          uuid: string
        }
        Insert: {
          card_name: string
          cmc?: number | null
          color_identity?: string[] | null
          edhrec_rank?: number | null
          id?: number
          image_url?: string | null
          keywords?: string[] | null
          last_synced_at?: string
          legalities?: Json | null
          mana_cost?: string | null
          oracle_text?: string | null
          partner_group_tag?: string | null
          partner_type?: string | null
          partner_with_scryfall_id?: string | null
          released_at?: string | null
          scryfall_id: string
          scryfall_url: string
          type_line?: string | null
          uuid?: string
        }
        Update: {
          card_name?: string
          cmc?: number | null
          color_identity?: string[] | null
          edhrec_rank?: number | null
          id?: number
          image_url?: string | null
          keywords?: string[] | null
          last_synced_at?: string
          legalities?: Json | null
          mana_cost?: string | null
          oracle_text?: string | null
          partner_group_tag?: string | null
          partner_type?: string | null
          partner_with_scryfall_id?: string | null
          released_at?: string | null
          scryfall_id?: string
          scryfall_url?: string
          type_line?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mtg_commanders_partner_with"
            columns: ["partner_with_scryfall_id"]
            isOneToOne: false
            referencedRelation: "mtg_commanders"
            referencedColumns: ["scryfall_id"]
          },
        ]
      }
      mtg_formats: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: number
          name: string
          updated_at: string
          uuid: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: number
          name: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: number
          name?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          cap: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
          province: string | null
          type: string
          updated_at: string
          uuid: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          cap?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: number
          name: string
          phone?: string | null
          province?: string | null
          type: string
          updated_at?: string
          uuid?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          cap?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
          province?: string | null
          type?: string
          updated_at?: string
          uuid?: string
          website_url?: string | null
        }
        Relationships: []
      }
      pauperwave_associate_geocodes: {
        Row: {
          associate_uuid: string
          geocoded_at: string
          latitude: number
          longitude: number
        }
        Insert: {
          associate_uuid: string
          geocoded_at?: string
          latitude: number
          longitude: number
        }
        Update: {
          associate_uuid?: string
          geocoded_at?: string
          latitude?: number
          longitude?: number
        }
        Relationships: [
          {
            foreignKeyName: "pauperwave_associate_geocodes_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: true
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_associate_geocodes_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: true
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
        ]
      }
      pauperwave_associate_renewals: {
        Row: {
          associate_uuid: string
          id: number
          renewal_date: string
          renewal_year: number
          uuid: string
        }
        Insert: {
          associate_uuid: string
          id?: number
          renewal_date?: string
          renewal_year: number
          uuid?: string
        }
        Update: {
          associate_uuid?: string
          id?: number
          renewal_date?: string
          renewal_year?: number
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pauperwave_associate_renewals_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_pauperwave_associate_renewals_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
        ]
      }
      pauperwave_associates: {
        Row: {
          associate_type: string | null
          association_date: string | null
          born_date: string
          born_location: string | null
          born_province: string | null
          born_state: string | null
          consent_data: boolean
          consent_social: boolean
          created_at: string
          created_by: string | null
          email_address: string
          first_name: string
          has_acknowledged_surveillance_notice: boolean
          has_read_statute: boolean
          id: number
          last_name: string
          membership_request_status: string
          mtga_nickname: string | null
          mtgo_nickname: string | null
          pauperwave_associate_number: string | null
          payment_date: string | null
          phone_number: string | null
          request_date: string
          residency_address: string
          residency_cap: string
          residency_city: string
          residency_house_number: string | null
          residency_province: string
          tax_code: string | null
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          associate_type?: string | null
          association_date?: string | null
          born_date: string
          born_location?: string | null
          born_province?: string | null
          born_state?: string | null
          consent_data?: boolean
          consent_social?: boolean
          created_at?: string
          created_by?: string | null
          email_address: string
          first_name: string
          has_acknowledged_surveillance_notice?: boolean
          has_read_statute?: boolean
          id?: number
          last_name: string
          membership_request_status: string
          mtga_nickname?: string | null
          mtgo_nickname?: string | null
          pauperwave_associate_number?: string | null
          payment_date?: string | null
          phone_number?: string | null
          request_date: string
          residency_address: string
          residency_cap: string
          residency_city: string
          residency_house_number?: string | null
          residency_province: string
          tax_code?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          associate_type?: string | null
          association_date?: string | null
          born_date?: string
          born_location?: string | null
          born_province?: string | null
          born_state?: string | null
          consent_data?: boolean
          consent_social?: boolean
          created_at?: string
          created_by?: string | null
          email_address?: string
          first_name?: string
          has_acknowledged_surveillance_notice?: boolean
          has_read_statute?: boolean
          id?: number
          last_name?: string
          membership_request_status?: string
          mtga_nickname?: string | null
          mtgo_nickname?: string | null
          pauperwave_associate_number?: string | null
          payment_date?: string | null
          phone_number?: string | null
          request_date?: string
          residency_address?: string
          residency_cap?: string
          residency_city?: string
          residency_house_number?: string | null
          residency_province?: string
          tax_code?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: []
      }
      pauperwave_cardtrader_blueprints: {
        Row: {
          expansion_id: number
          id: number
          name: string
          scryfall_id: string
          synced_at: string
        }
        Insert: {
          expansion_id: number
          id: number
          name: string
          scryfall_id: string
          synced_at?: string
        }
        Update: {
          expansion_id?: number
          id?: number
          name?: string
          scryfall_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pauperwave_cardtrader_blueprints_expansion_id_fkey"
            columns: ["expansion_id"]
            isOneToOne: false
            referencedRelation: "pauperwave_cardtrader_expansions"
            referencedColumns: ["id"]
          },
        ]
      }
      pauperwave_cardtrader_expansions: {
        Row: {
          code: string
          game_id: number
          id: number
          name: string
          synced_at: string
        }
        Insert: {
          code: string
          game_id: number
          id: number
          name: string
          synced_at?: string
        }
        Update: {
          code?: string
          game_id?: number
          id?: number
          name?: string
          synced_at?: string
        }
        Relationships: []
      }
      pauperwave_payments: {
        Row: {
          associate_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_name: string | null
          event_uuid: string | null
          id: number
          notes: string
          payer_email: string | null
          payer_name: string | null
          payer_surname: string | null
          payer_tax_code: string | null
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_type: string
          received_by: string
          tournament_uuid: string | null
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          associate_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_name?: string | null
          event_uuid?: string | null
          id?: number
          notes?: string
          payer_email?: string | null
          payer_name?: string | null
          payer_surname?: string | null
          payer_tax_code?: string | null
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          payment_type?: string
          received_by: string
          tournament_uuid?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          associate_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_name?: string | null
          event_uuid?: string | null
          id?: number
          notes?: string
          payer_email?: string | null
          payer_name?: string | null
          payer_surname?: string | null
          payer_tax_code?: string | null
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          payment_type?: string
          received_by?: string
          tournament_uuid?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pauperwave_payments_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_pauperwave_payments_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_pauperwave_payments_event_uuid_fkey"
            columns: ["event_uuid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_pauperwave_payments_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
        ]
      }
      pauperwave_wanted_cards: {
        Row: {
          card_name: string
          cardmarket_price: number | null
          cardmarket_price_synced_at: string | null
          cardtrader_price: number | null
          cardtrader_price_synced_at: string | null
          cmc: number | null
          color_identity: string[]
          copies: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          found_at: string | null
          id: number
          image_url: string | null
          language: string | null
          mana_cost: string | null
          notes: string | null
          player_associate_uuid: string
          requested_at: string | null
          scryfall_id: string | null
          scryfall_url: string | null
          set_code: string | null
          status: string
          treatment: string[]
          type_line: string | null
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          card_name: string
          cardmarket_price?: number | null
          cardmarket_price_synced_at?: string | null
          cardtrader_price?: number | null
          cardtrader_price_synced_at?: string | null
          cmc?: number | null
          color_identity?: string[]
          copies?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          found_at?: string | null
          id?: never
          image_url?: string | null
          language?: string | null
          mana_cost?: string | null
          notes?: string | null
          player_associate_uuid: string
          requested_at?: string | null
          scryfall_id?: string | null
          scryfall_url?: string | null
          set_code?: string | null
          status?: string
          treatment?: string[]
          type_line?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          card_name?: string
          cardmarket_price?: number | null
          cardmarket_price_synced_at?: string | null
          cardtrader_price?: number | null
          cardtrader_price_synced_at?: string | null
          cmc?: number | null
          color_identity?: string[]
          copies?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          found_at?: string | null
          id?: never
          image_url?: string | null
          language?: string | null
          mana_cost?: string | null
          notes?: string | null
          player_associate_uuid?: string
          requested_at?: string | null
          scryfall_id?: string | null
          scryfall_url?: string | null
          set_code?: string | null
          status?: string
          treatment?: string[]
          type_line?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "pauperwave_wanted_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_wanted_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_wanted_cards_player_associate_uuid_fkey"
            columns: ["player_associate_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_wanted_cards_player_associate_uuid_fkey"
            columns: ["player_associate_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_wanted_cards_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "pauperwave_wanted_cards_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          created_at: string
          error_message: string | null
          id: number
          payment_uuid: string
          pdf_url: string | null
          sent_at: string | null
          sent_to_email: string
          status: string
          updated_at: string
          uuid: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: number
          payment_uuid: string
          pdf_url?: string | null
          sent_at?: string | null
          sent_to_email: string
          status?: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: number
          payment_uuid?: string
          pdf_url?: string | null
          sent_at?: string | null
          sent_to_email?: string
          status?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_receipts_payment_uuid"
            columns: ["payment_uuid"]
            isOneToOne: false
            referencedRelation: "pauperwave_payments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      players: {
        Row: {
          associate_uuid: string
          created_at: string
          id: number
          nickname: string | null
          updated_at: string
          user_id: string | null
          uuid: string
        }
        Insert: {
          associate_uuid: string
          created_at?: string
          id?: number
          nickname?: string | null
          updated_at?: string
          user_id?: string | null
          uuid?: string
        }
        Update: {
          associate_uuid?: string
          created_at?: string
          id?: number
          nickname?: string | null
          updated_at?: string
          user_id?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_players_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: true
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_players_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: true
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
        ]
      }
      ruleset__descriptions: {
        Row: {
          category: string
          description: string
          id: number
        }
        Insert: {
          category: string
          description: string
          id?: number
        }
        Update: {
          category?: string
          description?: string
          id?: number
        }
        Relationships: []
      }
      ruleset__points: {
        Row: {
          category: string
          id: number
          points: number
          ruleset_uuid: string
        }
        Insert: {
          category: string
          id?: number
          points: number
          ruleset_uuid: string
        }
        Update: {
          category?: string
          id?: number
          points?: number
          ruleset_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ruleset__points_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "ruleset__descriptions"
            referencedColumns: ["category"]
          },
          {
            foreignKeyName: "fk_rulesets_points_ruleset_uuid"
            columns: ["ruleset_uuid"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["uuid"]
          },
        ]
      }
      rulesets: {
        Row: {
          created_at: string
          id: number
          is_default: boolean
          name: string
          updated_at: string
          uuid: string
          version: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_default?: boolean
          name: string
          updated_at?: string
          uuid?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_default?: boolean
          name?: string
          updated_at?: string
          uuid?: string
          version?: string | null
        }
        Relationships: []
      }
      sync_metadata: {
        Row: {
          card_count: number
          last_synced_at: string
          sync_status: string
          table_name: string
        }
        Insert: {
          card_count: number
          last_synced_at: string
          sync_status?: string
          table_name: string
        }
        Update: {
          card_count?: number
          last_synced_at?: string
          sync_status?: string
          table_name?: string
        }
        Relationships: []
      }
      tournament_kills: {
        Row: {
          created_at: string
          id: number
          killed_player_uuid: string
          killer_uuid: string
          pairing_uuid: string
          tournament_uuid: string
          uuid: string
        }
        Insert: {
          created_at?: string
          id?: number
          killed_player_uuid: string
          killer_uuid: string
          pairing_uuid: string
          tournament_uuid: string
          uuid?: string
        }
        Update: {
          created_at?: string
          id?: number
          killed_player_uuid?: string
          killer_uuid?: string
          pairing_uuid?: string
          tournament_uuid?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_kills_killed_player_uuid_fkey"
            columns: ["killed_player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_killed_player_uuid_fkey"
            columns: ["killed_player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_killer_uuid_fkey"
            columns: ["killer_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_killer_uuid_fkey"
            columns: ["killer_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_pairing_uuid_fkey"
            columns: ["pairing_uuid"]
            isOneToOne: false
            referencedRelation: "tournament_pairings"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_pairings: {
        Row: {
          created_at: string
          id: number
          player1_uuid: string | null
          player2_uuid: string | null
          player3_uuid: string | null
          player4_uuid: string | null
          round_uuid: string
          status: string
          table_number: number | null
          tournament_uuid: string
          updated_at: string
          uuid: string
        }
        Insert: {
          created_at?: string
          id?: number
          player1_uuid?: string | null
          player2_uuid?: string | null
          player3_uuid?: string | null
          player4_uuid?: string | null
          round_uuid: string
          status?: string
          table_number?: number | null
          tournament_uuid: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          created_at?: string
          id?: number
          player1_uuid?: string | null
          player2_uuid?: string | null
          player3_uuid?: string | null
          player4_uuid?: string | null
          round_uuid?: string
          status?: string
          table_number?: number | null
          tournament_uuid?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_pairings_player1_fkey"
            columns: ["player1_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player1_fkey"
            columns: ["player1_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player2_fkey"
            columns: ["player2_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player2_fkey"
            columns: ["player2_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player3_fkey"
            columns: ["player3_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player3_fkey"
            columns: ["player3_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player4_fkey"
            columns: ["player4_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_player4_fkey"
            columns: ["player4_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_round_uuid_fkey"
            columns: ["round_uuid"]
            isOneToOne: false
            referencedRelation: "tournament_rounds"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_pairings_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          checked_in_at: string | null
          created_at: string
          id: number
          player_uuid: string
          status: string
          tournament_uuid: string
          updated_at: string
          uuid: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          id?: number
          player_uuid: string
          status?: string
          tournament_uuid: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          id?: number
          player_uuid?: string
          status?: string
          tournament_uuid?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_registrations_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_registrations_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_registrations_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_round_results: {
        Row: {
          commander_deck_uuid: string | null
          created_at: string
          id: number
          pairing_uuid: string
          player_uuid: string
          position: number | null
          tournament_uuid: string
          uuid: string
        }
        Insert: {
          commander_deck_uuid?: string | null
          created_at?: string
          id?: number
          pairing_uuid: string
          player_uuid: string
          position?: number | null
          tournament_uuid: string
          uuid?: string
        }
        Update: {
          commander_deck_uuid?: string | null
          created_at?: string
          id?: number
          pairing_uuid?: string
          player_uuid?: string
          position?: number | null
          tournament_uuid?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_round_results_commander_deck_uuid_fkey"
            columns: ["commander_deck_uuid"]
            isOneToOne: false
            referencedRelation: "commander_decks"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_round_results_pairing_uuid_fkey"
            columns: ["pairing_uuid"]
            isOneToOne: false
            referencedRelation: "tournament_pairings"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_round_results_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_round_results_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_round_results_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_rounds: {
        Row: {
          created_at: string
          ended_at: string | null
          id: number
          pairings_approved_at: string | null
          round_number: number
          started_at: string | null
          status: string
          tournament_uuid: string
          updated_at: string
          uuid: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: number
          pairings_approved_at?: string | null
          round_number: number
          started_at?: string | null
          status?: string
          tournament_uuid: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: number
          pairings_approved_at?: string | null
          round_number?: number
          started_at?: string | null
          status?: string
          tournament_uuid?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_rounds_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          created_at: string
          id: number
          player_rank: number | null
          player_score: number | null
          player_uuid: string
          player_victories: number | null
          registration_uuid: string
          tournament_uuid: string
          updated_at: string
          uuid: string
          votes_brew_received: number | null
          votes_play_received: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          player_rank?: number | null
          player_score?: number | null
          player_uuid: string
          player_victories?: number | null
          registration_uuid: string
          tournament_uuid: string
          updated_at?: string
          uuid?: string
          votes_brew_received?: number | null
          votes_play_received?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          player_rank?: number | null
          player_score?: number | null
          player_uuid?: string
          player_victories?: number | null
          registration_uuid?: string
          tournament_uuid?: string
          updated_at?: string
          uuid?: string
          votes_brew_received?: number | null
          votes_play_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_standings_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_standings_player_uuid_fkey"
            columns: ["player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_standings_registration_uuid_fkey"
            columns: ["registration_uuid"]
            isOneToOne: true
            referencedRelation: "tournament_registrations"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_standings_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_votes: {
        Row: {
          created_at: string
          id: number
          pairing_uuid: string
          tournament_uuid: string
          uuid: string
          vote_type: string
          voted_player_uuid: string
          voter_uuid: string
        }
        Insert: {
          created_at?: string
          id?: number
          pairing_uuid: string
          tournament_uuid: string
          uuid?: string
          vote_type: string
          voted_player_uuid: string
          voter_uuid: string
        }
        Update: {
          created_at?: string
          id?: number
          pairing_uuid?: string
          tournament_uuid?: string
          uuid?: string
          vote_type?: string
          voted_player_uuid?: string
          voter_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_votes_pairing_uuid_fkey"
            columns: ["pairing_uuid"]
            isOneToOne: false
            referencedRelation: "tournament_pairings"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_votes_tournament_uuid_fkey"
            columns: ["tournament_uuid"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_votes_voted_player_uuid_fkey"
            columns: ["voted_player_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_votes_voted_player_uuid_fkey"
            columns: ["voted_player_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_votes_voter_uuid_fkey"
            columns: ["voter_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_votes_voter_uuid_fkey"
            columns: ["voter_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournaments: {
        Row: {
          cittadino_edition_uuid: string | null
          companion_code: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          entry_fee: number | null
          event_uuid: string | null
          format_uuid: string
          id: number
          image_url: string | null
          league_uuid: string | null
          location_uuid: string | null
          name: string
          organizer_uuid: string | null
          participant_names: string[]
          prizes: string | null
          registered_players: number | null
          round_count: number | null
          round_current: number | null
          starts_at: string | null
          status: string
          updated_at: string
          uuid: string
        }
        Insert: {
          cittadino_edition_uuid?: string | null
          companion_code?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          event_uuid?: string | null
          format_uuid: string
          id?: number
          image_url?: string | null
          league_uuid?: string | null
          location_uuid?: string | null
          name: string
          organizer_uuid?: string | null
          participant_names?: string[]
          prizes?: string | null
          registered_players?: number | null
          round_count?: number | null
          round_current?: number | null
          starts_at?: string | null
          status: string
          updated_at?: string
          uuid?: string
        }
        Update: {
          cittadino_edition_uuid?: string | null
          companion_code?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          entry_fee?: number | null
          event_uuid?: string | null
          format_uuid?: string
          id?: number
          image_url?: string | null
          league_uuid?: string | null
          location_uuid?: string | null
          name?: string
          organizer_uuid?: string | null
          participant_names?: string[]
          prizes?: string | null
          registered_players?: number | null
          round_count?: number | null
          round_current?: number | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournaments_event_uuid_fkey"
            columns: ["event_uuid"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournaments_format_uuid_fkey"
            columns: ["format_uuid"]
            isOneToOne: false
            referencedRelation: "mtg_formats"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournaments_league_uuid_fkey"
            columns: ["league_uuid"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "tournaments_cittadino_edition_uuid_fkey"
            columns: ["cittadino_edition_uuid"]
            isOneToOne: false
            referencedRelation: "cittadino_editions"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "tournaments_location_uuid_fkey"
            columns: ["location_uuid"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "tournaments_organizer_uuid_fkey"
            columns: ["organizer_uuid"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["uuid"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      pauperwave_associates_with_status: {
        Row: {
          associate_type: string | null
          association_date: string | null
          born_date: string | null
          born_location: string | null
          born_province: string | null
          born_state: string | null
          consent_data: boolean | null
          consent_social: boolean | null
          created_at: string | null
          created_by: string | null
          email_address: string | null
          first_name: string | null
          has_acknowledged_surveillance_notice: boolean | null
          has_read_statute: boolean | null
          id: number | null
          last_name: string | null
          latest_renewal_year: number | null
          membership_request_status: string | null
          membership_status: string | null
          mtga_nickname: string | null
          mtgo_nickname: string | null
          pauperwave_associate_number: string | null
          payment_date: string | null
          phone_number: string | null
          request_date: string | null
          residency_address: string | null
          residency_cap: string | null
          residency_city: string | null
          residency_house_number: string | null
          residency_province: string | null
          tax_code: string | null
          updated_at: string | null
          updated_by: string | null
          uuid: string | null
        }
        Relationships: []
      }
      players_full: {
        Row: {
          associate_uuid: string | null
          created_at: string | null
          email_address: string | null
          first_name: string | null
          id: number | null
          is_active: boolean | null
          last_name: string | null
          nickname: string | null
          pauperwave_associate_number: string | null
          user_id: string | null
          uuid: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_players_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: true
            referencedRelation: "pauperwave_associates"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_players_associate_uuid_fkey"
            columns: ["associate_uuid"]
            isOneToOne: true
            referencedRelation: "pauperwave_associates_with_status"
            referencedColumns: ["uuid"]
          },
        ]
      }
      tournament_kills_summary: {
        Row: {
          kill_count: number | null
          killer_uuid: string | null
          pairing_uuid: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_kills_killer_uuid_fkey"
            columns: ["killer_uuid"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_killer_uuid_fkey"
            columns: ["killer_uuid"]
            isOneToOne: false
            referencedRelation: "players_full"
            referencedColumns: ["uuid"]
          },
          {
            foreignKeyName: "fk_tournament_kills_pairing_uuid_fkey"
            columns: ["pairing_uuid"]
            isOneToOne: false
            referencedRelation: "tournament_pairings"
            referencedColumns: ["uuid"]
          },
        ]
      }
    }
    Functions: {
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_management_permissions: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_organizer: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "player" | "organizer" | "admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["player", "organizer", "admin", "super_admin"],
    },
  },
} as const
