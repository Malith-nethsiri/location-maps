# Final Valuation Report Structure Template



---

## Report Template Structure

### DOCUMENT HEADER
```


{HONORABLE} {FULL_NAME}
{PROFESSIONAL_TITLE}
{QUALIFICATIONS_LIST}
{PROFESSIONAL_STATUS}

RESIDENCE : {HOUSE_NUMBER}, {STREET_NAME},     Telephone : {PHONE_NUMBER}
            {AREA_NAME},                       Mobile    : {MOBILE_NUMBER}
            {CITY}, {DISTRICT}                 E-mail    : {EMAIL_ADDRESS}

(above infomations should be collected and stored in the user profile we shouldnt let the user to fill these for each and every time we will get the info from where we stored and we will use those in the report we have to discuss about this ????)

My Ref. : {VALUER_REFERENCE}                Date: {REPORT_DATE}
(my reference nuimber will be put by the user)
```

---

### MAIN TITLE SECTION
```
                        VALUATION REPORT
                               OF
              {PROPERTY_DESCRIPTION_TITLE
              (it should go as this The Property Depicted As {Lot number} In {Plan No} {Dated}
 Made By {name of the Licensed Surveyor}, Licensed Surveyor. )}

```

---

### 1.0 PREAMBLE
```
This valuation report is prepared on the instructions given by {INSTRUCTION_SOURCE},
{CLIENT_DESIGNATION}, {CLIENT_ORGANIZATION}, {CLIENT_ADDRESS}, {INSTRUCTION_METHOD}
dated {INSTRUCTION_DATE}, for the purpose of {VALUATION_PURPOSE}.

The property was inspected on {INSPECTION_DATE} in the presence of {PERSONS_PRESENT}.
```

**Data Fields Required:**
- `INSTRUCTION_SOURCE`: Client name and title
- `CLIENT_DESIGNATION`: Position/title of client
- `CLIENT_ORGANIZATION`: Company/bank/institution name
- `CLIENT_ADDRESS`: Full client address
- `INSTRUCTION_METHOD`: Letter, email, phone call reference
- `INSTRUCTION_DATE`: Date of instruction
- `VALUATION_PURPOSE`: Purpose of valuation (mortgage, fair value, etc.)
- `INSPECTION_DATE`: Date of property inspection
- `PERSONS_PRESENT`: Names and roles of people present during inspection

---

### 2.0 SCOPE OF WORK
```
This report is prepared in compliance with the SLFRS 13, International Valuation Standards
incorporated in RICS Valuation – Professional Standards {RICS_YEAR}, commonly referred to as
the 'Red Book' published by the Royal Institution of Chartered Surveyors, UK.

I am independent in terms of the code of ethics of my profession, and there were no
circumstances that impair or even appear to impair the objectivity of my work.

{FAIR_VALUE_DEFINITION}
{MARKET_VALUE_DEFINITION}
```

**Data Fields Required:**
- `RICS_YEAR`: Current year of RICS standards
- `FAIR_VALUE_DEFINITION`: Standard definition based on SLFRS 13
- `MARKET_VALUE_DEFINITION`: RICS definition of market value
if we can give some data for these like a dropdown list to collect thta will be greate so we have to find those infomations from the internet
---

### 3.0 PROPERTY IDENTIFICATION

#### 3.1 Location
```
The subject property is situated in the Village of {VILLAGE_NAME} within the
{PRADESHIYA_SABHA} in {KORALE} of {HATHPATTU} in the District of {DISTRICT},
{PROVINCE}.

GPS Coordinates: Latitude {LATITUDE}, Longitude {LONGITUDE}
```

#### 3.2 Legal Description
```
The property to be valued is identified as the land depicted as Lot {LOT_NUMBER}
in Plan No: {PLAN_NUMBER} dated {SURVEY_DATE} made by {LICENSED_SURVEYOR},
Licensed Surveyor. This Survey Plan has been approved by the {APPROVING_AUTHORITY}
on {APPROVAL_DATE}.
```

#### 3.3 Ownership
```
As per the documents available, by virtue of the Deed of Transfer No: {DEED_NUMBER}
dated {DEED_DATE} attested by {NOTARY_PUBLIC}, the subject property is presently
owned by {CURRENT_OWNER}.
```

#### 3.4 Land Details
```
Name of Land: {LAND_NAME}
Extent: Lot No: {LOT_NUMBER}; {ACRES} A - {ROODS} R - {PERCHES} P ({HECTARES} Hectares)
```

**Data Fields Required:**
- Location fields: `VILLAGE_NAME`, `PRADESHIYA_SABHA`, `KORALE`, `HATHPATTU`, `DISTRICT`, `PROVINCE`
- Coordinates: `LATITUDE`, `LONGITUDE`
- Legal fields: `LOT_NUMBER`, `PLAN_NUMBER`, `SURVEY_DATE`, `LICENSED_SURVEYOR`, `APPROVING_AUTHORITY`, `APPROVAL_DATE`
- Ownership fields: `DEED_NUMBER`, `DEED_DATE`, `NOTARY_PUBLIC`, `CURRENT_OWNER`
- Land details: `LAND_NAME`, `ACRES`, `ROODS`, `PERCHES`, `HECTARES`

---

### 4.0 ACCESS AND ACCESSIBILITY

#### 4.1 Route Description
```
to this we should enter something like these two examples bellow

ex 1-
 From Clocktower junction of Dambulla, proceed along Trincomalee Road for about
17.2km up to Digampathana, turn right on to the road leading to “Aliya Resort” and
proceed for about 1km. Then turn left and proceed for about 1.2km. The subject
property lies on the left hand side of the road and fronting it, Named “Seerock The King’s
Domain”.

ex 2-
From Maho town,  proceed along Rest house road  for a distance of about 1 ½ Kilometers  turn
right on to gravel road and proceed about 200 Meters to reach the property on right side of the road
fronting same.

to get these infomations as we are getting the way of acessing the property from our website so the thing we have to do is we are getting the way of acessing the location from the nearest city the problem is we have to do something about it to make that way of acess is more user frendly and more readable to the client the problem with the data that is getting from the website is not have clear instructions like the examples so we have to do somrthing about that too? we have to discuss about this????
```

#### 4.2 Location Map
```
to this we shoould enter the image we are capturing through the our current website and put it here so we have to discuss about this too how to put it here correcly ??????
```


### 5.0 BOUNDARIES
```
As per survey plan:
North by: {NORTH_BOUNDARY}
East by:  {EAST_BOUNDARY}
South by: {SOUTH_BOUNDARY}
West by:  {WEST_BOUNDARY}

All boundaries were checked and identified by me on the ground and found correct.
```

**Data Fields Required:**
- Boundary descriptions: `NORTH_BOUNDARY`, `EAST_BOUNDARY`, `SOUTH_BOUNDARY`, `WEST_BOUNDARY`


---

### 6.0 DESCRIPTION OF LAND

#### 6.1 Topography
```
This is {LAND_SHAPE} shaped {TOPOGRAPHY_TYPE} block of land with {LAND_USE_TYPE},
having a frontage of about {FRONTAGE_MEASUREMENT} to the {ACCESS_ROAD_TYPE}
along the {BOUNDARY_DIRECTION} boundary.
```

#### 6.2 Soil & Water Table
```
The soil is {SOIL_TYPE} and is suitable for {SUITABLE_USE}. The water table is
about {WATER_TABLE_DEPTH} feet below the ground level and the land is
{FLOOD_STATUS}.
```

#### 6.3 Plantation
```
The land contains {PLANTATION_DESCRIPTION} with {PLANTATION_DETAILS}.
```

#### 6.4 Property Images
```
[ORGANIZED IMAGE GRID]
- Land views showing topography
- Boundary demarcations
- Plantation and vegetation
- Access roads and approaches
```

**Data Fields Required:**
- Topography: `LAND_SHAPE`, `TOPOGRAPHY_TYPE`, `LAND_USE_TYPE`, `FRONTAGE_MEASUREMENT`, `ACCESS_ROAD_TYPE`, `BOUNDARY_DIRECTION`
- Soil: `SOIL_TYPE`, `SUITABLE_USE`, `WATER_TABLE_DEPTH`, `FLOOD_STATUS`
- Plantation: `PLANTATION_DESCRIPTION`, `PLANTATION_DETAILS`

some of these infomations are cant be filled with like one two word so they are like some discription so we have to deal with this and the way that shoould th euser should type and they should matches this likes a parragraph we should give like a placeholder text so they can match that with there data and then taht will be correct this i thinck shoould impliment for each and every thing in this data collection process
---

### 7.0 DESCRIPTION OF BUILDINGS

#### 7.1 Construction Details
```
{BUILDING_TYPE} type building in {CONDITION_GRADE} condition, about {BUILDING_AGE}
years old.

Roof:    {ROOF_DESCRIPTION}
Walls:   {WALL_DESCRIPTION}
Floor:   {FLOOR_DESCRIPTION}
Doors & Windows: {DOORS_WINDOWS_DESCRIPTION}
```

#### 7.2 Accommodation
```
{ROOM_LAYOUT_DESCRIPTION}
Total Floor Area: {TOTAL_FLOOR_AREA} square feet
```

#### 7.3 Conveniences
```
{CONVENIENCES_LIST}
```

#### 7.4 Building Images
```
[ORGANIZED BUILDING IMAGES]
- External views from multiple angles
- Internal room views
- Construction details
- Facilities and conveniences
```

**Data Fields Required:**
- Building basics: `BUILDING_TYPE`, `CONDITION_GRADE`, `BUILDING_AGE`
- Construction: `ROOF_DESCRIPTION`, `WALL_DESCRIPTION`, `FLOOR_DESCRIPTION`, `DOORS_WINDOWS_DESCRIPTION`
- Layout: `ROOM_LAYOUT_DESCRIPTION`, `TOTAL_FLOOR_AREA`
- Services: `CONVENIENCES_LIST`

---

### 8.0 LOCALITY DESCRIPTION
```
This is a {LOCALITY_TYPE} locality about {DISTANCE_TO_TOWN} away from {NEAREST_TOWN}.
The area is {DEVELOPMENT_LEVEL} with {INFRASTRUCTURE_DESCRIPTION}.

Nearby facilities include:
• {NEARBY_FACILITIES_LIST}

{MARKET_DEMAND_ANALYSIS}
```

**Data Fields Required:**
- Area: `LOCALITY_TYPE`, `DISTANCE_TO_TOWN`, `NEAREST_TOWN`, `DEVELOPMENT_LEVEL`, `INFRASTRUCTURE_DESCRIPTION`
- Facilities: `NEARBY_FACILITIES_LIST`
- Market: `MARKET_DEMAND_ANALYSIS`

---

### 9.0 PLANNING REGULATIONS
```
#### 9.1 Street Line & Building Limits
The subject property is located within the {LOCAL_AUTHORITY} area and
{STREET_LINE_STATUS}.

#### 9.2 Other Regulatory Matters
{REGULATORY_COMPLIANCE_STATUS}
```

**Data Fields Required:**
- Regulations: `LOCAL_AUTHORITY`, `STREET_LINE_STATUS`, `REGULATORY_COMPLIANCE_STATUS`

---

### 10.0 EVIDENCE OF VALUE
```
#### 10.1 Land Value Evidence
{MARKET_EVIDENCE_ANALYSIS}

Recent transactions in the locality indicate land values ranging from
Rs. {MIN_RATE}/= to Rs. {MAX_RATE}/= per perch, depending on {RATE_FACTORS}.
```

**Data Fields Required:**
- Market data: `MARKET_EVIDENCE_ANALYSIS`, `MIN_RATE`, `MAX_RATE`, `RATE_FACTORS`

---

### 11.0 APPROACH TO VALUATION
```
#### 11.1 Valuation Methodology
{METHODOLOGY_EXPLANATION}

#### 11.2 Approach Selection
{APPROACH_JUSTIFICATION}

Taking into consideration the above facts and having regard to {VALUATION_FACTORS},
I adopt a rate of Rs. {ADOPTED_RATE}/= per perch for the land.
```

**Data Fields Required:**
- Method: `METHODOLOGY_EXPLANATION`, `APPROACH_JUSTIFICATION`, `VALUATION_FACTORS`, `ADOPTED_RATE`

---

### 12.0 VALUATION

#### 12.1 Contractor's Method
```
LAND: Extent: {LAND_EXTENT} @ Rs. {LAND_RATE}/= per perch = Rs. {LAND_VALUE}/=

BUILDING VALUE:
{BUILDING_DESCRIPTION} building
F.A. {FLOOR_AREA} sq. ft @ Rs. {BUILDING_RATE}/= per sq. ft.
Less {DEPRECIATION_RATE}% for Depreciation = Rs. {BUILDING_VALUE}/=

{ADDITIONAL_COMPONENTS}

Total Market Value = Rs. {TOTAL_MARKET_VALUE}/=
```

#### 12.2 Valuation Summary
```
Market Value of the property.................... = Rs. {MARKET_VALUE}/=
({MARKET_VALUE_WORDS})

Forced Sale Value of the property............... = Rs. {FORCED_SALE_VALUE}/=
({FORCED_SALE_VALUE_WORDS})

Insurance Value of building..................... = Rs. {INSURANCE_VALUE}/=
({INSURANCE_VALUE_WORDS})
```

**Data Fields Required:**
- Land valuation: `LAND_EXTENT`, `LAND_RATE`, `LAND_VALUE`
- Building valuation: `FLOOR_AREA`, `BUILDING_RATE`, `DEPRECIATION_RATE`, `BUILDING_VALUE`
- Components: `ADDITIONAL_COMPONENTS`
- Final values: `TOTAL_MARKET_VALUE`, `MARKET_VALUE`, `FORCED_SALE_VALUE`, `INSURANCE_VALUE`
- Value words: `MARKET_VALUE_WORDS`, `FORCED_SALE_VALUE_WORDS`, `INSURANCE_VALUE_WORDS`

---

### 13.0 CERTIFICATION AND DISCLAIMER
```
I do hereby certify that the property depicted as Lot {LOT_NUMBER} in Plan No. {PLAN_NUMBER},
surveyed and partitioned on {SURVEY_DATE}, made by {LICENSED_SURVEYOR}, Licensed Surveyor
is valued at Rs. {FINAL_VALUE}/= as at {VALUATION_DATE}.

I also certify that it is provided with {ACCESS_CERTIFICATION}.

{STANDARD_DISCLAIMERS}

                    ..............................
                    {VALUER_NAME}
                    {PROFESSIONAL_TITLE}
                    IVSL Reg. No: {IVSL_REGISTRATION}
```

**Data Fields Required:**
- Certification: `FINAL_VALUE`, `VALUATION_DATE`, `ACCESS_CERTIFICATION`
- Disclaimers: `STANDARD_DISCLAIMERS`
- Valuer: `VALUER_NAME`, `PROFESSIONAL_TITLE`, `IVSL_REGISTRATION`

---

## Report Formatting Specifications

### Page Layout
- **Paper Size**: A4 (210 × 297 mm)
- **Margins**: Top: 25mm, Bottom: 25mm, Left: 30mm, Right: 20mm
- **Font**: Times New Roman
- **Font Sizes**:
  - Title: 14pt Bold
  - Headings: 12pt Bold
  - Body text: 11pt
  - Footer: 10pt

### Image Specifications
- **Resolution**: Minimum 300 DPI for print quality
- **Format**: JPEG for photographs, PNG for maps/diagrams
- **Size**: Consistent sizing within sections
- **Layout**: Professional grid layout with captions

### Table Formatting
- **Border Style**: Simple black borders
- **Cell Padding**: 3mm
- **Header Rows**: Bold text with light gray background
- **Alignment**: Left for text, right for numbers

### Color Scheme
- **Text**: Black (#000000)
- **Headings**: Dark blue (#1f4e79)
- **Tables**: Light gray headers (#f2f2f2)
- **Maps**: Standard Google Maps styling

### Quality Control Elements
- **Page Numbers**: Bottom center
- **Headers**: Valuer name and report reference
- **Watermarks**: "DRAFT" until final approval
- **Version Control**: Document revision tracking

---



we have to descuss and deside how to collect data from the user effectively so the user didnt wants to enter the same data twice repetedly so taht can also save the time so we have to discuss about that too so this is the report structure and ideas of me lets discuss about this deeply and tell me your ideas and after a good and depp and long descussin we will go for the building the project part.
