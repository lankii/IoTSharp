﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace IoTSharp.Data
{
   public class DeviceDiagram
    {
        public Guid DiagramId { get; set; }
        public string DiagramName { get; set; }
        public string DiagramDesc { get; set; }
        public int? DiagramStatus { get; set; }
        public Guid Creator { get; set; }
        public DateTimeOffset? CreateDate { get; set; }
        public long? OrgId { get; set; }
        public string DiagramImage { get; set; }
        public bool? IsDefault { get; set; }

      
 
    }
}